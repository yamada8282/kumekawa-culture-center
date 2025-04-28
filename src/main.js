"use strict";

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

// シーンのセットアップ
const scene = new THREE.Scene();
// 背景色を透明に設定
scene.background = null;

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 1.6, 3);

const renderer = new THREE.WebGLRenderer({ 
  antialias: true,
  alpha: true  // 透明な背景を許可
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.shadowMap.enabled = true;
// 透明な背景の設定
renderer.setClearColor(0x000000, 0);
document.body.appendChild(renderer.domElement);

// OrbitControlsの設定
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true; // 滑らかなカメラ操作
controls.dampingFactor = 0.05;
controls.minDistance = 1; // 最小ズーム距離
controls.maxDistance = 10; // 最大ズーム距離
controls.maxPolarAngle = Math.PI / 2; // 地面より下にはいかないように制限

// ライトの追加
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
directionalLight.position.set(5, 5, 5);
directionalLight.castShadow = true;
scene.add(directionalLight);

// キューブの作成（サンプルオブジェクト）
const geometry = new THREE.BoxGeometry(0.5, 0.5, 0.5);
const material = new THREE.MeshStandardMaterial({ color: 0x00ff00 });
const cube = new THREE.Mesh(geometry, material);
cube.position.set(0, 0.5, 0);
cube.castShadow = true;
scene.add(cube);

// マガジンを表示するオブジェクト（目印として赤いキューブを追加）
const magazineMarkerGeometry = new THREE.BoxGeometry(0.3, 0.3, 0.3);
const magazineMarkerMaterial = new THREE.MeshStandardMaterial({ color: 0xff0000 });
const magazineMarker = new THREE.Mesh(magazineMarkerGeometry, magazineMarkerMaterial);
magazineMarker.position.set(1.5, 0.5, 0);
magazineMarker.castShadow = true;
magazineMarker.userData.isMagazineMarker = true; // マーカーであることを示すフラグ
scene.add(magazineMarker);

// クリック可能なメッシュを格納する配列
const clickableMeshes = [];
clickableMeshes.push(magazineMarker); // マガジンマーカーを追加

// GLTFローダーでルームモデルをロード
const loader = new GLTFLoader();
loader.load(
  'room.glb',
  (gltf) => {
    const model = gltf.scene;
    model.scale.set(1, 1, 1);
    model.position.set(0, 0, 0);
    
    // モデル内のすべてのメッシュを登録する
    model.traverse((node) => {
      if (node.isMesh) {
        node.castShadow = true;
        node.receiveShadow = true;
        
        // すべてのメッシュをクリック可能リストに追加
        clickableMeshes.push(node);
        
        // 各メッシュに識別用のユーザーデータを追加
        node.userData.meshName = node.name || `部屋の一部（${clickableMeshes.length}）`;
        
        // マガジンを表示するメッシュを指定（例：名前に「magazine」や「book」を含むメッシュ）
        // 注意: 実際のモデルの内容によって条件を調整してください
        if (node.name && (node.name.toLowerCase().includes('magazine') || 
                          node.name.toLowerCase().includes('book') ||
                          node.name.toLowerCase().includes('desk'))) {
          node.userData.ismagazinePoint = true;
        }
      }
    });
    
    scene.add(model);
    console.log(`モデルに含まれるメッシュ数: ${clickableMeshes.length}`);
  },
  (xhr) => {
    console.log((xhr.loaded / xhr.total * 100) + '% loaded');
  },
  (error) => {
    console.error('モデルの読み込みに失敗しました', error);
  }
);

// マガジンモーダルの要素を取得
const magazineModal = document.getElementById('magazine-modal');
const closeButton = document.getElementById('close-magazine');

// モーダルを閉じる処理
if (closeButton) {
  closeButton.addEventListener('click', () => {
    magazineModal.style.display = 'none';
  });
}

// マガジンを表示する関数
function showMagazine() {
  if (magazineModal) {
    magazineModal.style.display = 'flex';
  }
}

// Raycasterとマウス位置の設定
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

// クリックイベントのリスナー
window.addEventListener('click', (event) => {
  // マウス位置を正規化
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
  
  // レイキャスティング
  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects(scene.children, true);
  
  if (intersects.length > 0) {
    const hitObject = intersects[0].object;
    
    // サンプルキューブをクリックした場合
    if (hitObject === cube) {
      showInfo('サンプルキューブ');
      return;
    }
    
    // マガジンマーカーまたはマガジンポイントをクリックした場合
    if (hitObject === magazineMarker || 
        (hitObject.userData && hitObject.userData.ismagazinePoint)) {
      showInfo('マガジンが表示できます');
      showMagazine();
      return;
    }
    
    // クリックされたメッシュがモデルの一部である場合
    if (clickableMeshes.includes(hitObject)) {
      const meshName = hitObject.userData.meshName;
      showInfo(meshName);
      
      // クリックされたオブジェクトを少し強調表示（色を変更）
      const originalColor = hitObject.material.color.clone();
      hitObject.material.emissive = new THREE.Color(0x333333);
      
      // 2秒後に元の状態に戻す
      setTimeout(() => {
        hitObject.material.emissive = new THREE.Color(0x000000);
      }, 2000);
    }
  }
});

// モーダル外のクリックでも閉じられるようにする
window.addEventListener('click', (event) => {
  if (event.target === magazineModal) {
    magazineModal.style.display = 'none';
  }
});

// ESCキーでモーダルを閉じる
window.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && magazineModal.style.display === 'flex') {
    magazineModal.style.display = 'none';
  }
});

// 情報パネル表示関数
function showInfo(name) {
  const infoPanel = document.getElementById('info');
  infoPanel.textContent = `これは${name}です`;
  infoPanel.style.display = 'block';
  
  // 5秒後に情報パネルを非表示にする
  setTimeout(() => {
    infoPanel.style.display = 'none';
  }, 5000);
}

// ウィンドウリサイズ対応
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// アニメーションループ
function animate() {
  requestAnimationFrame(animate);
  
  // キューブを回転させる
  cube.rotation.x += 0.01;
  cube.rotation.y += 0.01;
  
  // マガジンマーカーを回転させる
  magazineMarker.rotation.y += 0.02;
  
  // コントロールを更新
  controls.update();
  
  renderer.render(scene, camera);
}

animate(); 
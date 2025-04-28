"use strict";

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { MTLLoader } from 'three/examples/jsm/loaders/MTLLoader.js';
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

// クリック可能なメッシュを格納する配列
const clickableMeshes = [];

// TVモデルを読み込む
let tvMesh;
loadTVModel();

function loadTVModel() {
  // OBJファイルローダーの作成
  const objLoader = new OBJLoader();
  
  // オプション: マテリアルファイルがある場合はロード
  const mtlLoader = new MTLLoader();
  mtlLoader.load('tv.mtl', (materials) => {
    materials.preload();
    
    objLoader.setMaterials(materials);
    // OBJファイルをロード
    objLoader.load(
      'tv.obj', // OBJファイルのパス
      (object) => {
        // ロードされたオブジェクトの設定
        object.scale.set(0.5, 0.5, 0.5); // 適切なサイズに調整
        object.position.set(0, 0, 0);    // 位置を設定
        
        // オブジェクト内のメッシュに影を設定
        object.traverse((child) => {
          if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
            
            // テレビ画面に該当するメッシュを検出
            // 実際のモデルに合わせて条件を調整する必要があります
            if (child.name.toLowerCase().includes('screen') || 
                child.material.name?.toLowerCase().includes('screen')) {
              tvMesh = child;
              tvMesh.userData.isTVScreen = true;
              tvMesh.userData.meshName = "テレビ画面";
            }
            
            // すべてのメッシュをクリック可能に
            clickableMeshes.push(child);
          }
        });
        
        // テレビ画面が特定できなかった場合は、最初のメッシュをテレビ画面とする
        if (!tvMesh && object.children.length > 0) {
          tvMesh = object.children[0];
          tvMesh.userData.isTVScreen = true;
          tvMesh.userData.meshName = "テレビ";
        }
        
        scene.add(object);
        console.log('TVモデルがロードされました');
      },
      // 読み込み進捗の処理
      (xhr) => {
        console.log((xhr.loaded / xhr.total * 100) + '% TVモデルをロード中');
      },
      // エラー処理
      (error) => {
        console.error('TVモデルのロードに失敗しました', error);
        // エラー時のフォールバック：基本的なボックスを表示
        createBasicTVModel();
      }
    );
  }, undefined, (error) => {
    console.error('MTLファイルのロードに失敗しました', error);
    // MTLファイルなしでOBJをロード
    objLoader.load(
      'tv.obj',
      (object) => {
        object.scale.set(0.5, 0.5, 0.5);
        object.position.set(0, 0, 0);
        
        object.traverse((child) => {
          if (child.isMesh) {
            // デフォルトのマテリアルを設定
            child.material = new THREE.MeshStandardMaterial({ 
              color: 0x333333,
              roughness: 0.5,
              metalness: 0.5
            });
            
            child.castShadow = true;
            child.receiveShadow = true;
            
            if (!tvMesh) {
              tvMesh = child;
              tvMesh.userData.isTVScreen = true;
              tvMesh.userData.meshName = "テレビ";
            }
            
            clickableMeshes.push(child);
          }
        });
        
        scene.add(object);
        console.log('TVモデルがロードされました（マテリアルなし）');
      },
      (xhr) => {
        console.log((xhr.loaded / xhr.total * 100) + '% TVモデルをロード中');
      },
      (error) => {
        console.error('TVモデルのロードに失敗しました', error);
        createBasicTVModel();
      }
    );
  });
  
  // 地面を作成
  const floorGeometry = new THREE.PlaneGeometry(10, 10);
  const floorMaterial = new THREE.MeshStandardMaterial({ 
    color: 0xeeeeee,
    roughness: 0.8,
    metalness: 0.2
  });
  const floor = new THREE.Mesh(floorGeometry, floorMaterial);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = 0;
  floor.receiveShadow = true;
  scene.add(floor);
}

// OBJファイルのロードに失敗した場合のフォールバック
function createBasicTVModel() {
  console.log('基本的なTVモデルを作成します');
  
  // テレビの台座（箱）を作成
  const tvStandGeometry = new THREE.BoxGeometry(1.2, 0.1, 0.6);
  const tvStandMaterial = new THREE.MeshStandardMaterial({ color: 0x333333 });
  const tvStand = new THREE.Mesh(tvStandGeometry, tvStandMaterial);
  tvStand.position.set(0, 0.05, 0);
  tvStand.castShadow = true;
  tvStand.receiveShadow = true;
  scene.add(tvStand);
  
  // テレビの本体（箱）を作成
  const tvBodyGeometry = new THREE.BoxGeometry(1, 0.6, 0.1);
  const tvBodyMaterial = new THREE.MeshStandardMaterial({ color: 0x222222 });
  const tvBody = new THREE.Mesh(tvBodyGeometry, tvBodyMaterial);
  tvBody.position.set(0, 0.4, 0);
  tvBody.castShadow = true;
  tvBody.receiveShadow = true;
  scene.add(tvBody);
  
  // テレビの画面を作成
  const tvScreenGeometry = new THREE.PlaneGeometry(0.9, 0.5);
  const tvScreenMaterial = new THREE.MeshBasicMaterial({ 
    color: 0x0077cc,
    emissive: 0x0077cc,
    emissiveIntensity: 0.5
  });
  const tvScreen = new THREE.Mesh(tvScreenGeometry, tvScreenMaterial);
  tvScreen.position.set(0, 0.4, 0.06);
  scene.add(tvScreen);
  
  // テレビモデルをクリック可能に
  tvMesh = tvScreen;
  tvMesh.userData.isTVScreen = true;
  tvMesh.userData.meshName = "テレビ画面";
  clickableMeshes.push(tvMesh);
}

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
        
        // TVに関連するメッシュを見つけた場合
        if (node.name && (node.name.toLowerCase().includes('tv') || 
                         node.name.toLowerCase().includes('television') ||
                         node.name.toLowerCase().includes('screen'))) {
          node.userData.isTVScreen = true;
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
    
    // TVの画面をクリックした場合、マガジンを表示
    if (hitObject === tvMesh || 
        (hitObject.userData && hitObject.userData.isTVScreen)) {
      showInfo('テレビ画面 - マガジンが表示できます');
      showMagazine();
      return;
    }
    
    // クリックされたメッシュがモデルの一部である場合
    if (clickableMeshes.includes(hitObject)) {
      const meshName = hitObject.userData.meshName;
      showInfo(meshName);
      
      // クリックされたオブジェクトを少し強調表示（色を変更）
      if (hitObject.material && hitObject.material.emissive) {
        hitObject.material.emissive = new THREE.Color(0x333333);
        
        // 2秒後に元の状態に戻す
        setTimeout(() => {
          hitObject.material.emissive = new THREE.Color(0x000000);
        }, 2000);
      }
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
  
  // コントロールを更新
  controls.update();
  
  renderer.render(scene, camera);
}

animate(); 
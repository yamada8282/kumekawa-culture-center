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
camera.position.set(0.50, 0.95, 1.07);

// カメラの向きを設定（調整された理想的な視点）
camera.lookAt(0.50, 0.67, -0.87);

console.log('カメラ初期位置:', camera.position);
console.log('カメラが向いている方向:', camera.rotation);

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

// 二本指（タッチパッド）での視点回転（一人称視点）
let rotationX = 0, rotationY = 0;
const rotationSpeed = 0.002;

// カメラの初期位置を保存（この位置から動かない）
const fixedCameraPosition = new THREE.Vector3(0.50, 0.95, 1.07);
camera.position.copy(fixedCameraPosition);

// モーダル要素を先に取得
const worksModal = document.getElementById('works-modal');
const contactModal = document.getElementById('contact-modal');

// ホイールイベントリスナー（タッチパッドの二本指スワイプも含む）
document.addEventListener('wheel', (event) => {
  // モーダルが開いている場合はスクロールを許可
  const isModalOpen = (worksModal && worksModal.style.display === 'flex') ||
                      (contactModal && contactModal.style.display === 'flex');
  
  if (isModalOpen) {
    // モーダルが開いている場合はスクロールを許可
    return;
  }
  
  // デフォルトのスクロール動作を無効化
  event.preventDefault();
  
  // タッチパッドの二本指操作を検出
  const deltaX = event.deltaX;
  const deltaY = event.deltaY;
  
  // 回転角度を更新
  rotationY += deltaX * rotationSpeed; // 左右回転（Y軸）
  rotationX += deltaY * rotationSpeed; // 上下回転（X軸）
  
  // 上下回転の制限（首の可動域）
  rotationX = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, rotationX));
  
  // カメラの向きを更新
  updateCameraRotation();
}, { passive: false }); // passiveをfalseにしてpreventDefault()を有効にする

// カメラの回転を更新する関数
function updateCameraRotation() {
  // カメラの位置は固定
  camera.position.copy(fixedCameraPosition);
  
  // オイラー角で回転を設定
  camera.rotation.order = 'YXZ';
  camera.rotation.y = rotationY;
  camera.rotation.x = rotationX;
  camera.rotation.z = 0;
}


// ライトの追加（初期値で作成、後でGUIパラメータで更新）
const ambientLight = new THREE.AmbientLight(0xffffff, 1.5);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 2.4);
directionalLight.position.set(5, 5, 5);
directionalLight.castShadow = true;
scene.add(directionalLight);

// クリック可能なメッシュを格納する配列
const clickableMeshes = [];

// モデル管理用変数
let imacMesh;
let whiteboardModel; // GUIで操作するため

// ローディング管理
let loadingProgress = 0;
let totalModels = 3; // iMac, Display, Whiteboard
let loadedModels = 0;

// ローディング画面を管理
function updateLoadingProgress() {
  loadedModels++;
  loadingProgress = Math.round((loadedModels / totalModels) * 100);
  
  const progressElement = document.getElementById('loading-progress');
  if (progressElement) {
    progressElement.textContent = `${loadingProgress}%`;
  }
  
  if (loadedModels >= totalModels) {
    // 全てのモデルが読み込まれたら少し待ってからローディング画面を非表示
    setTimeout(() => {
      hideLoadingScreen();
    }, 1000);
  }
}

// ローディング画面を非表示
function hideLoadingScreen() {
  const loadingScreen = document.getElementById('loading-screen');
  if (loadingScreen) {
    loadingScreen.style.opacity = '0';
    loadingScreen.style.transition = 'opacity 0.5s ease-out';
    setTimeout(() => {
      loadingScreen.style.display = 'none';
    }, 500);
  }
}

// GUI設定を削除（GUIパラメータは使用しないが、初期化で使われる場合があるので値は保持）
const guiParams = {
  // iMac設定
  imacX: 0.5,
  imacY: 0,
  imacZ: -0.8,
  imacScaleX: 1.2,
  imacScaleY: 1.1,
  imacScaleZ: 1.1,
  imacRotationY: 0.6,
  
  // Whiteboard設定
  whiteboardX: 1.29,
  whiteboardY: 0.24,
  whiteboardZ: -1.41,
  whiteboardScaleX: 0.4,
  whiteboardScaleY: 0.4,
  whiteboardScaleZ: 0.4,
  whiteboardRotationY: 4,
  
  // ルーム設定
  roomX: 0,
  roomY: 0,
  roomZ: 0,
  roomScaleX: 1,
  roomScaleY: 1,
  roomScaleZ: 1,
  roomRotationY: 0,
  
  // カメラ設定
  cameraX: 0.50,
  cameraY: 0.95,
  cameraZ: 1.07,
  
  // ライト設定
  lightIntensity: 2.4,
  ambientIntensity: 1.5
};

// iMacモデルを読み込む
loadiMacModel();

// Displayモデルを読み込む
loadDisplayModel();

// Whiteboardモデルを読み込む
loadWhiteboardModel();

// カメラの初期位置とFOVを保存
const initialCameraPosition = new THREE.Vector3(0.50, 0.95, 1.07);
const initialCameraTarget = new THREE.Vector3(0.50, 0.67, -0.87);
const initialCameraFov = 75;

// カメラアニメーションの状態を管理
let cameraAnimation = {
  enabled: false,
  startPosition: new THREE.Vector3(),
  startTarget: new THREE.Vector3(),
  endPosition: new THREE.Vector3(),
  endTarget: new THREE.Vector3(),
  startTime: 0,
  duration: 1000, // ミリ秒単位でのアニメーション時間
  targetObject: null,
  startFov: 75,   // 開始時の視野角
  endFov: 45      // 終了時の視野角（小さいほどズーム効果）
};

function loadiMacModel() {
  // GLTFローダーでiMacモデルをロード
  const imacLoader = new GLTFLoader();
  console.log('imac.glbの読み込みを開始します...');
  
  imacLoader.load(
    'imac.glb',
    (gltf) => {
      console.log('imac.glbが正常に読み込まれました！', gltf);
      const model = gltf.scene;
      // 最適化された初期値を設定
      model.scale.set(1.2, 1.1, 1.1);
      model.position.set(0.5, 0, -0.8);
      model.rotation.y = 0.6;
      
      // モデル内のすべてのメッシュを登録する
      model.traverse((node) => {
        if (node.isMesh) {
          console.log('iMacメッシュを発見:', node.name || 'unnamed mesh');
          node.castShadow = true;
          node.receiveShadow = true;
          
          // すべてのメッシュをクリック可能リストに追加
          clickableMeshes.push(node);
          
          // iMacの画面に該当するメッシュを検出
          if (node.name && (node.name.toLowerCase().includes('screen') || 
                           node.name.toLowerCase().includes('display') ||
                           node.name.toLowerCase().includes('monitor'))) {
            imacMesh = node;
            imacMesh.userData.isScreen = true;
            imacMesh.userData.meshName = "iMac画面";
          }
          
          // 各メッシュに識別用のユーザーデータを追加（iMacであることを明示）
          node.userData.meshName = `iMac_${node.name || 'mesh'}`;
          console.log('🔧 iMacメッシュ名設定:', node.userData.meshName);
        }
      });
      
      // iMac画面が特定できなかった場合は、最初のメッシュを画面とする
      if (!imacMesh && model.children.length > 0) {
        imacMesh = model.children[0];
        imacMesh.userData.isScreen = true;
        imacMesh.userData.meshName = "iMac";
      }
      
      scene.add(model);
      
      // iMacモデル自体を発光させる
      addiMacGlow(model);
      
      console.log('iMacモデルがロードされました');
      console.log('初期位置:', model.position);
      updateLoadingProgress(); // ローディング進捗を更新
    },
      (xhr) => {
      console.log(`imac.glb読み込み進捗: ${(xhr.loaded / xhr.total * 100).toFixed(1)}%`);
      },
      (error) => {
      console.error('imac.glbの読み込みに失敗しました:', error);
      // エラー時のフォールバック：基本的なiMacモデルを作成
      createBasiciMacModel();
    }
  );

}

// iMacファイルのロードに失敗した場合のフォールバック
function createBasiciMacModel() {
  console.log('基本的なiMacモデルを作成します');
  
  // 最適化された値（固定値として使用）
  const imacX = 0.5;
  const imacY = 0;
  const imacZ = -0.8;
  const imacScaleX = 1.2;
  const imacScaleY = 1.1;
  const imacScaleZ = 1.1;
  const imacRotationY = 0.6;
  const heightOffset = imacY;
  
  // iMacのスタンド（台座）を作成
  const standGeometry = new THREE.CylinderGeometry(0.15, 0.2, 0.05, 16);
  const standMaterial = new THREE.MeshStandardMaterial({ 
    color: 0xcccccc,
    metalness: 0.8,
    roughness: 0.2
  });
  const stand = new THREE.Mesh(standGeometry, standMaterial);
  stand.position.set(imacX, 0.025 + heightOffset, imacZ);
  stand.rotation.y = imacRotationY;
  stand.castShadow = true;
  stand.receiveShadow = true;
  scene.add(stand);
  
  // iMacの本体（薄い箱）を作成
  const bodyGeometry = new THREE.BoxGeometry(1.2 * imacScaleX, 0.8 * imacScaleY, 0.05 * imacScaleZ);
  const bodyMaterial = new THREE.MeshStandardMaterial({ 
    color: 0xdddddd,
    metalness: 0.7,
    roughness: 0.3
  });
  const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
  body.position.set(imacX, 0.5 + heightOffset, imacZ);
  body.rotation.y = imacRotationY;
  body.castShadow = true;
  body.receiveShadow = true;
  scene.add(body);
  
  // フォールバック用iMacには画面を作成しない（display.glbで代替）
  console.log('フォールバック用iMacモデルを作成しました（画面なし）');
}

function loadDisplayModel() {
  // ディスプレイは非表示にする
  console.log('ディスプレイモデルは非表示に設定されています');
  updateLoadingProgress(); // ローディング進捗を更新
}

function loadWhiteboardModel() {
  // GLTFローダーでWhiteboardモデルをロード
  const whiteboardLoader = new GLTFLoader();
  console.log('whiteboard.glbの読み込みを開始します...');
  
  whiteboardLoader.load(
    'whiteboard.glb',
    (gltf) => {
      console.log('whiteboard.glbが正常に読み込まれました！', gltf);
      const model = gltf.scene;
      
      // GUIパラメータで初期化
      model.scale.set(guiParams.whiteboardScaleX, guiParams.whiteboardScaleY, guiParams.whiteboardScaleZ);
      model.position.set(guiParams.whiteboardX, guiParams.whiteboardY, guiParams.whiteboardZ);
      model.rotation.y = guiParams.whiteboardRotationY;
      
      // モデル内のすべてのメッシュを登録する
      model.traverse((node) => {
        if (node.isMesh) {
          node.castShadow = true;
          node.receiveShadow = true;
          
          // すべてのメッシュをクリック可能リストに追加
          clickableMeshes.push(node);
          
          // 各メッシュに識別用のユーザーデータを追加
          node.userData.meshName = `ホワイトボード_${node.name || 'mesh'}`;
        }
      });
      
      scene.add(model);
      whiteboardModel = model; // GUI操作用に保存
      
      // Whiteboardモデル自体を発光させる
      addWhiteboardGlow(model);
      
      console.log('Whiteboardモデルがロードされました');
      console.log('初期位置:', model.position);
      console.log('クリック可能メッシュ数:', clickableMeshes.length);
      updateLoadingProgress(); // ローディング進捗を更新
      
      // ホワイトボードのメッシュを確認
      model.traverse((node) => {
        if (node.isMesh) {
          console.log('ホワイトボードメッシュ:', node.name, 'userData:', node.userData);
        }
      });
      
      // GUIコントロールは削除
      },
      (xhr) => {
      console.log(`whiteboard.glb読み込み進捗: ${(xhr.loaded / xhr.total * 100).toFixed(1)}%`);
      },
      (error) => {
      console.error('whiteboard.glbの読み込みに失敗しました:', error);
      console.log('フォールバック: 基本的なホワイトボードを作成します');
      createBasicWhiteboardModel();
    }
  );
}

// whiteboardモデルの読み込みに失敗した場合のフォールバック
function createBasicWhiteboardModel() {
  console.log('基本的なホワイトボードモデルを作成します');
  
  // ホワイトボード用のジオメトリを作成
  const boardGeometry = new THREE.PlaneGeometry(1.2, 0.8);
  const boardMaterial = new THREE.MeshStandardMaterial({ 
    color: 0xffffff,
    roughness: 0.3,
    metalness: 0.1
  });
  
  const boardMesh = new THREE.Mesh(boardGeometry, boardMaterial);
  
  // GUIパラメータで初期化
  boardMesh.position.set(guiParams.whiteboardX, guiParams.whiteboardY, guiParams.whiteboardZ);
  boardMesh.rotation.y = guiParams.whiteboardRotationY;
  boardMesh.scale.set(guiParams.whiteboardScaleX, guiParams.whiteboardScaleY, guiParams.whiteboardScaleZ);
  
  boardMesh.castShadow = true;
  boardMesh.receiveShadow = true;
  
  scene.add(boardMesh);
  
  // クリック用に設定
  boardMesh.userData.meshName = "ホワイトボード_フォールバック";
  clickableMeshes.push(boardMesh);
  
  whiteboardModel = boardMesh;
  
  // 基本ホワイトボードに発光効果を追加
  addWhiteboardGlow(boardMesh);
  
  console.log('基本ホワイトボードモデルを作成しました');
}

// displayモデルの読み込みに失敗した場合のフォールバック
function createBasicDisplayModel() {
  console.log('基本的なディスプレイモデルを作成します');
  
  // 画面用のジオメトリを作成
  const screenGeometry = new THREE.PlaneGeometry(0.8, 0.5); // 適度なサイズ
  
  // 発光する画面マテリアル
  const screenMaterial = new THREE.MeshStandardMaterial({
    color: 0x001122,           // 暗い青
    emissive: 0x0088ff,        // 明るい青の発光
    emissiveIntensity: 0.8,    // 発光の強さ
    metalness: 0.1,
    roughness: 0.1,
    transparent: true,
    opacity: 0.95
  });
  
  // 画面メッシュを作成
  const screenMesh = new THREE.Mesh(screenGeometry, screenMaterial);
  
  // iMacの画面位置に配置
  screenMesh.position.set(0.5, 0.1, -0.7); // iMacの前面
  screenMesh.rotation.y = 0.6;              // iMacと同じ回転
  
  scene.add(screenMesh);
  
  // クリック用にimacMeshとして設定
  imacMesh = screenMesh;
  imacMesh.userData.isScreen = true;
  imacMesh.userData.meshName = "ディスプレイ画面（フォールバック）";
  clickableMeshes.push(imacMesh);
  
  console.log('基本ディスプレイモデルを作成しました');
}



// GLTFローダーでルームモデルをロード
const loader = new GLTFLoader();
console.log('tamaruroom.glbの読み込みを開始します...');
loader.load(
  'tamaruroom.glb',
  (gltf) => {
    console.log('tamaruroom.glbが正常に読み込まれました！', gltf);
    const model = gltf.scene;
    model.scale.set(1, 1, 1);
    model.position.set(0, 0, 0);
    
    console.log('モデルの境界ボックス:', model);
    
    // モデル内のすべてのメッシュを登録する
    model.traverse((node) => {
      if (node.isMesh) {
        console.log('メッシュを発見:', node.name || 'unnamed mesh');
        node.castShadow = true;
        node.receiveShadow = true;
        
        // 部屋のメッシュはクリック不可にする（表示のみ）
        // clickableMeshes.push(node); // コメントアウト
        
        // 各メッシュに識別用のユーザーデータを追加
        node.userData.meshName = node.name || `部屋の一部（非クリック）`;
        
        // iMacに関連するメッシュを見つけた場合
        if (node.name && (node.name.toLowerCase().includes('imac') || 
                         node.name.toLowerCase().includes('mac') ||
                         node.name.toLowerCase().includes('computer'))) {
          node.userData.isScreen = true;
        }
      }
    });
    
    scene.add(model);
    console.log(`モデルに含まれるメッシュ数: ${clickableMeshes.length}`);
    console.log('シーンに追加されたオブジェクト数:', scene.children.length);
    console.log('ルーム初期位置:', model.position);
  },
  (xhr) => {
    console.log(`tamaruroom.glb読み込み進捗: ${(xhr.loaded / xhr.total * 100).toFixed(1)}%`);
  },
  (error) => {
    console.error('tamaruroom.glbの読み込みに失敗しました:', error);
    console.error('ファイルが存在するか確認してください');
  }
);

// iMacモデル自体を発光させる関数
function addiMacGlow(imacModel) {
  console.log('iMacモデルに発光効果を適用中...');
  
  let meshCount = 0;
  imacModel.traverse((child) => {
    if (child.isMesh) {
      meshCount++;
      console.log('iMacメッシュを発見:', child.name || `mesh_${meshCount}`);
      
      // 発光プロパティを初期化（普段は光らない）
      if (child.material) {
        child.material.emissive = new THREE.Color(0x000000); // 発光なし
        child.material.emissiveIntensity = 0; // 発光強度0
        
        console.log('メッシュを初期化:', child.name || `mesh_${meshCount}`);
      }
      
      // クリック可能リストに追加
      clickableMeshes.push(child);
      
      // 各メッシュに識別用のユーザーデータを追加
      child.userData.meshName = child.name || `iMacの一部（${meshCount}）`;
      
      // 最初のメッシュをimacMeshとして設定（クリック用）
      if (!imacMesh) {
        imacMesh = child;
        imacMesh.userData.isScreen = true;
        imacMesh.userData.meshName = "iMac本体";
      }
    }
  });
  
      console.log(`✅ iMacモデルに発光効果を適用完了（${meshCount}個のメッシュ）`);
  }

// whiteboardモデルに発光効果を追加
function addWhiteboardGlow(model) {
  console.log('🔅 Whiteboardモデルに発光効果を追加中...');
  
  let meshCount = 0;
  
  if (model.isMesh) {
    // 単一メッシュの場合
    const originalMaterial = model.material;
    const glowMaterial = originalMaterial.clone ? originalMaterial.clone() : originalMaterial;
    
    // 発光効果の設定（デフォルトは非発光）
    glowMaterial.emissive = new THREE.Color(0x000000); // 黒（発光なし）
    glowMaterial.emissiveIntensity = 0;
    
    model.material = glowMaterial;
    meshCount++;
  } else {
    // 複数メッシュを含むモデルの場合
    model.traverse((node) => {
      if (node.isMesh && node.material) {
        const originalMaterial = node.material;
        const glowMaterial = originalMaterial.clone ? originalMaterial.clone() : originalMaterial;
        
        // 発光効果の設定（デフォルトは非発光）
        glowMaterial.emissive = new THREE.Color(0x000000); // 黒（発光なし）
        glowMaterial.emissiveIntensity = 0;
        
        node.material = glowMaterial;
        meshCount++;
      }
    });
  }
  
  console.log(`✅ Whiteboardモデルに発光効果を適用完了（${meshCount}個のメッシュ）`);
}

// GUIコントロールを作成する関数
// GUI関連のコードは削除

// モーダル要素は上で既に取得済み

// 閉じるボタンの要素を取得
// closeMagazine削除済み
const closeWorks = document.getElementById('close-works');
const closeContact = document.getElementById('close-contact');

// デバッグ用ログ
console.log('🔍 モーダル要素の確認:');
// magazineModal削除済み
console.log('worksModal:', worksModal);
console.log('contactModal:', contactModal);
// closeMagazine削除済み
console.log('closeWorks:', closeWorks);
console.log('closeContact:', closeContact);

// 初期状態でモーダルを必ず非表示にする

// magazineModal削除済み
if (worksModal) {
  worksModal.style.display = 'none';
}
if (contactModal) {
  contactModal.style.display = 'none';
}

// モーダルを閉じる処理
// closeMagazine処理削除済み

if (closeWorks) {
  console.log('✅ closeWorksボタンが見つかりました');
  closeWorks.addEventListener('click', (event) => {
    console.log('🔴 Works モーダルを閉じます');
    event.stopPropagation(); // イベントバブリングを停止
    event.preventDefault(); // デフォルト動作を防止
    if (worksModal) {
      worksModal.style.display = 'none';
      console.log('✅ Works モーダルを非表示にしました');
    } else {
      console.log('❌ worksModal要素が見つかりません');
    }
  });
} else {
  console.log('❌ closeWorksボタンが見つかりません');
}

if (closeContact) {
  closeContact.addEventListener('click', (event) => {
    event.stopPropagation(); // イベントバブリングを停止
    event.preventDefault(); // デフォルト動作を防止
    contactModal.style.display = 'none';
  });
}

// showMagazine関数削除済み

// Worksモーダルを表示する関数
function showWorks() {
  if (worksModal) {
    loadWorksData(); // Works データを読み込んでから表示
    worksModal.style.display = 'flex';
  }
}

// Works データを読み込んで表示
async function loadWorksData() {
  try {
    // localStorageから読み込み（管理画面で更新されたデータ）
    const localData = localStorage.getItem('worksData');
    let works;
    
    if (localData) {
      works = JSON.parse(localData);
    } else {
      // localStorageにない場合はJSONファイルから読み込み
      const response = await fetch('works.json');
      works = await response.json();
    }
    
    displayWorksInModal(works);
  } catch (error) {
    console.error('Works読み込みエラー:', error);
    // エラー時はデフォルトのコンテンツを表示
    document.getElementById('works-content').innerHTML = '<p>作品データの読み込みに失敗しました。</p>';
  }
}

// Worksをモーダルに表示
function displayWorksInModal(works) {
  const worksContainer = document.getElementById('works-content');
  
  if (works.length === 0) {
    worksContainer.innerHTML = '<p>まだ作品が登録されていません。</p>';
    return;
  }
  
  const worksHTML = works.map(work => `
    <div class="work-item">
      <h3>${work.title}</h3>
      <p>${work.description}</p>
      ${work.image ? `<img src="${work.image}" alt="${work.title}" style="max-width: 100%; height: auto; margin: 10px 0; border-radius: 4px;">` : ''}
      <div class="work-tags">
        ${work.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
      </div>
      ${work.url ? `<div class="work-url">
        <a href="${work.url}" target="_blank" rel="noopener noreferrer">プロジェクトを見る</a>
      </div>` : ''}
      <div style="margin-top: 10px; font-size: 12px; color: rgba(255,255,255,0.7);">
        ${work.date}
      </div>
    </div>
  `).join('');
  
  worksContainer.innerHTML = worksHTML;
}

// Contactモーダルを表示する関数
function showContact() {
  if (contactModal) {
    contactModal.style.display = 'flex';
  }
}

// Raycasterとマウス位置の設定
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

// マウスオーバー用の変数
let hoveredMesh = null;
let originalEmissive = new Map(); // 元のemissive値を保存

// マウスオーバーイベント（軽量化版）
let lastMouseX = 0;
let lastMouseY = 0;
const MOUSE_THRESHOLD = 5; // マウス移動の閾値（ピクセル）

window.addEventListener('mousemove', (event) => {
  // マウス移動量が少ない場合は処理をスキップ
  const deltaX = Math.abs(event.clientX - lastMouseX);
  const deltaY = Math.abs(event.clientY - lastMouseY);
  
  if (deltaX < MOUSE_THRESHOLD && deltaY < MOUSE_THRESHOLD) {
    return;
  }
  
  lastMouseX = event.clientX;
  lastMouseY = event.clientY;
  
  // マウス位置を正規化
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
  
  // レイキャスティング（iMacとWhiteboard関連メッシュのみ対象）
  const hoverableMeshes = clickableMeshes.filter(mesh => 
    mesh.userData && mesh.userData.meshName && 
    (mesh.userData.meshName.includes('iMac') || 
     mesh.userData.isScreen ||
     mesh.userData.meshName.includes('ホワイトボード'))
  );
  
  // デバッグ: ホバー可能メッシュの数を確認（最初の1回のみ）
  if (hoverableMeshes.length === 0 && !window.debugLogged) {
    console.log('⚠️ ホバー可能メッシュが見つかりません');
    console.log('全クリック可能メッシュ:', clickableMeshes.map(m => m.userData?.meshName));
    window.debugLogged = true;
  }
  
  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects(hoverableMeshes, false);
  
  // 前回ハイライトしていたメッシュをリセット
  if (hoveredMesh && originalEmissive.has(hoveredMesh)) {
    hoveredMesh.material.emissive.copy(originalEmissive.get(hoveredMesh));
    hoveredMesh = null;
  }
  
  // 新しいメッシュにハイライト効果を適用
  if (intersects.length > 0) {
    const hitObject = intersects[0].object;
    console.log('🔍 ホバー検出:', hitObject.userData?.meshName);
    
    // 元のemissive値を保存（初回のみ）
    if (!originalEmissive.has(hitObject)) {
      originalEmissive.set(hitObject, hitObject.material.emissive.clone());
    }
    
    // ハイライト効果（明るい青）
    hitObject.material.emissive.set(0x0088ff);
    hitObject.material.emissiveIntensity = 0.8;
    
    hoveredMesh = hitObject;
  }
});

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
    
    // クリックされたメッシュがモデルの一部である場合
    if (clickableMeshes.includes(hitObject)) {
      const meshName = hitObject.userData.meshName;
      console.log('🎯 クリックされたオブジェクト:', meshName);
      console.log('🔍 hitObject:', hitObject);
      console.log('🔍 imacMesh:', imacMesh);
      console.log('🔍 userData:', hitObject.userData);
      // showInfo(meshName); // ログ表示を無効化
      
      // ホワイトボードの場合、Contactモーダルを表示
      if (meshName && meshName.includes('ホワイトボード')) {
        console.log('📋 ホワイトボードクリック → Contact表示');
        showContact();
      } 
      // iMacの場合のみ、Worksモーダルを表示
      else if (meshName && (meshName.includes('iMac') || meshName.includes('mesh01') || meshName.includes('mesh_0'))) {
        console.log('💻 iMacクリック → Works表示');
        console.log('🔍 検出されたmeshName:', meshName);
        showWorks();
      }
      // その他のオブジェクトは何もしない
      else {
        console.log('❓ その他のオブジェクト → アクションなし');
        // 強調表示のみ行う（モーダルは表示しない）
      }
      
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

// マガジンモーダル関連のイベント削除済み

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
  
  // カメラアニメーションは無効（固定位置のため）
  if (false && cameraAnimation.enabled) {
    const elapsed = Date.now() - cameraAnimation.startTime;
    const progress = Math.min(elapsed / cameraAnimation.duration, 1);
    
    // イージング関数（滑らかな加速と減速）
    const easedProgress = easeInOutCubic(progress);
    
    // カメラの位置を補間
    camera.position.lerpVectors(
      cameraAnimation.startPosition,
      cameraAnimation.endPosition,
      easedProgress
    );
    
    // コントロールのターゲットを補間
    controls.target.lerpVectors(
      cameraAnimation.startTarget,
      cameraAnimation.endTarget,
      easedProgress
    );
    
    // FOV（視野角）を補間してズーム効果を追加
    camera.fov = cameraAnimation.startFov * (1 - easedProgress) + cameraAnimation.endFov * easedProgress;
    
    // カメラの更新
    camera.updateProjectionMatrix();
    controls.update();
    
    // アニメーション終了チェック
    if (progress >= 1) {
      cameraAnimation.enabled = false;
      controls.enabled = true; // コントロールを再有効化
    }
  }
  
  renderer.render(scene, camera);
}

// イージング関数（滑らかな加速と減速）
function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

// カメラをターゲットオブジェクトに移動させる関数
function moveCamera(targetObject) {
  // 現在のカメラの位置とコントロールのターゲットを保存
  cameraAnimation.startPosition.copy(camera.position);
  cameraAnimation.startTarget.copy(controls.target);
  cameraAnimation.startFov = camera.fov;
  
  // 対象オブジェクトの位置とバウンディングボックスを取得
  const targetPosition = new THREE.Vector3();
  targetObject.getWorldPosition(targetPosition);
  
  // iMacの位置を基準にカメラを配置
  const imacPosition = new THREE.Vector3(0.5, 0, -0.8); // iMacの位置
  const whiteboardPosition = new THREE.Vector3(1.29, 0.24, -1.41); // Whiteboardの位置
  
  // クリックされたオブジェクトがwhiteboardかiMacかを判定
  let targetPos;
  let lookAtTarget;
  
  if (targetObject.userData.meshName && targetObject.userData.meshName.includes('ホワイトボード')) {
    // Whiteboardの場合
    targetPos = whiteboardPosition;
    const direction = new THREE.Vector3().subVectors(camera.position, whiteboardPosition).normalize();
    cameraAnimation.endPosition.copy(whiteboardPosition).add(direction.multiplyScalar(0.3));
    cameraAnimation.endPosition.y = whiteboardPosition.y + 0.4; // whiteboardより少し上
    lookAtTarget = new THREE.Vector3(whiteboardPosition.x, whiteboardPosition.y + 0.2, whiteboardPosition.z);
  } else {
    // iMacの場合（デフォルト）
    targetPos = imacPosition;
    const direction = new THREE.Vector3().subVectors(camera.position, imacPosition).normalize();
    cameraAnimation.endPosition.copy(imacPosition).add(direction.multiplyScalar(0.2));
    cameraAnimation.endPosition.y = imacPosition.y + 0.3; // iMacより少し上
    lookAtTarget = new THREE.Vector3(imacPosition.x, imacPosition.y + 0.6, imacPosition.z);
  }
  cameraAnimation.endTarget.copy(lookAtTarget);
  
  // アニメーションの状態を設定
  cameraAnimation.enabled = true;
  cameraAnimation.startTime = Date.now();
  cameraAnimation.targetObject = targetObject;
  
  // カメラ移動中はコントロールを一時的に無効化
  controls.enabled = false;
}

// カメラを元の位置に戻す関数
function resetCameraPosition() {
  // 現在のカメラの位置とコントロールのターゲットを保存
  cameraAnimation.startPosition.copy(camera.position);
  cameraAnimation.startTarget.copy(controls.target);
  cameraAnimation.startFov = camera.fov;
  
  // 元の位置に戻す
  cameraAnimation.endPosition.copy(initialCameraPosition);
  cameraAnimation.endTarget.copy(initialCameraTarget);
  cameraAnimation.endFov = initialCameraFov;
  
  // アニメーションの状態を設定
  cameraAnimation.enabled = true;
  cameraAnimation.startTime = Date.now();
  cameraAnimation.duration = 1500; // 少し長めのアニメーション時間
  
  // カメラ移動中はコントロールを一時的に無効化
  controls.enabled = false;
}



animate(); 
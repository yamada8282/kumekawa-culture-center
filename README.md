# My3DRoom

Three.jsを使用した3Dルームビューアーアプリケーション。

## 機能

- 3Dルームモデルの表示
- オブジェクト（テレビ、冷蔵庫、ボードなど）のインタラクティブなクリック
- クリックしたオブジェクトに関する情報表示

## 実行方法

1. リポジトリをクローン
   ```
   git clone https://github.com/yourusername/My3DRoom.git
   cd My3DRoom
   ```

2. ローカルサーバーの起動
   以下のいずれかの方法でローカルサーバーを起動できます：
   
   - Node.jsの場合：
     ```
     npx serve
     ```
   
   - Pythonの場合：
     ```
     python -m http.server
     ```

3. ブラウザで `http://localhost:3000` または `http://localhost:8000` にアクセス

## 設定方法

- `room.glb` ファイルをプロジェクトのルートに配置してください
- モデル内のオブジェクト名は以下のように設定されていることを確認してください：
  - テレビ: `TV`
  - 冷蔵庫: `Fridge`
  - ボード: `Board`

## デプロイ

このプロジェクトはGitHub Pagesでホスティングすることができます。
メインブランチにプッシュすると、自動的にデプロイされます。

---

Made with Three.js 
# firebase/

Firestore のルール・インデックスと、ローカルエミュレータの設定。

- `firebase.json` … エミュレータ（Auth 9099 / Firestore 8080 / UI 4000）
- `.firebaserc` … デフォルトは `demo-tsugumi`（`demo-` で始まるIDは本番に接続しないエミュレータ専用）
- `firestore.rules` … Security Rules（フェーズ2で本実装）
- `emulator-data/` … `npm run emulators` 終了時に自動保存されるデータ（gitignore）

起動: リポジトリ直下で `npm run emulators`（Java 11 以上が必要）

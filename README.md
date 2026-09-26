# つぐみ（tsugumi）

黒字廃業しそうな地方の中小企業と、経営をやりたい若手を、6か月・3段階の「修行」でつなぐ事業承継サービスのMVP。
開発の前提と決まりは [CLAUDE.md](./CLAUDE.md)、仕様の正は Notion「Claude Code 引き継ぎ（つぐみ開発）」。

## はじめかた

```sh
npm install
cp .env.example .env            # 画面側の Firebase 設定
cp .dev.vars.example .dev.vars  # サーバー側の秘密値（gitignore 済み）
npm run dev                     # http://localhost:5173
```

Firebase エミュレータ（Java 11+ が必要）:

```sh
npm run emulators
```

コマンド一覧は CLAUDE.md の「コマンド」を参照。

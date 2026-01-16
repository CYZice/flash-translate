# CSS Anchor Positioning と Popover API

2026年1月、Firefox 147 のリリースにより、CSS Anchor Positioning が全ブラウザ対応を達成しました。これにより、JavaScript なしで HTML・CSS だけでポップオーバーの位置指定が可能になりました。

## 概要

### CSS Anchor Positioning とは

CSS Anchor Positioning は、ある要素（ポップオーバーなど）を別の要素（アンカー）に対して相対的に配置するためのCSS機能です。従来はJavaScriptで複雑な位置計算が必要でしたが、CSSのみで実現できるようになりました。

### Popover API とは

Popover API は、ポップオーバーの開閉管理を HTML 属性だけで実現する Web API です。以下の機能が自動的に実装されます：

- クリックでの開閉
- ESC キーでの閉鎖
- 背景クリックでの閉鎖（Light Dismiss）
- 適切なフォーカス管理

### 従来のJavaScript実装との比較

| 機能 | 従来（JavaScript） | Anchor Positioning + Popover API |
|------|-------------------|----------------------------------|
| 位置計算 | `getBoundingClientRect()` + 手動計算 | CSS `anchor()` 関数 |
| 開閉管理 | イベントリスナー設定 | `popover` / `popovertarget` 属性 |
| スクロール対応 | scroll イベント監視 | 自動対応 |
| リサイズ対応 | resize イベント監視 | 自動対応 |
| コード量 | 多い | 少ない |

## Popover API の基本

### 基本的なマークアップ

```html
<button popovertarget="my-popover">開く</button>

<div id="my-popover" popover>
  <p>ポップオーバーの内容</p>
</div>
```

このシンプルなマークアップだけで、以下が自動的に実装されます：

1. ボタンクリックでポップオーバーを開閉
2. ESC キーで閉じる
3. ポップオーバー外をクリックで閉じる
4. 適切なフォーカス管理

### popover 属性の値

| 値 | 説明 |
|----|------|
| `popover` / `popover="auto"` | Light Dismiss 有効（デフォルト） |
| `popover="manual"` | Light Dismiss 無効（明示的に閉じる必要あり） |

### popovertarget 属性

```html
<!-- 開閉トグル（デフォルト） -->
<button popovertarget="my-popover">トグル</button>

<!-- 開くのみ -->
<button popovertarget="my-popover" popovertargetaction="show">開く</button>

<!-- 閉じるのみ -->
<button popovertarget="my-popover" popovertargetaction="hide">閉じる</button>
```

## CSS Anchor Positioning の実装

Anchor Positioning は3ステップで実装します。

### ステップ1: アンカーを定義

アンカーとなる要素に `anchor-name` を設定します。

```css
.button {
  anchor-name: --my-anchor;
}
```

### ステップ2: アンカーに紐づけ

ポップオーバー側で `position-anchor` を使ってアンカーを指定します。

```css
.popover {
  position-anchor: --my-anchor;
}
```

### ステップ3: 位置を指定

`anchor()` 関数または `position-area` プロパティで位置を指定します。

## anchor() 関数

特定の位置を基準に配置できます。

```css
.popover {
  /* アンカーの下端に配置 */
  top: anchor(bottom);
  /* アンカーの中央に配置 */
  left: anchor(center);
}
```

### 利用可能な値

- `top` - アンカーの上端
- `bottom` - アンカーの下端
- `left` - アンカーの左端
- `right` - アンカーの右端
- `center` - アンカーの中央

### calc() との組み合わせ

余白の調整も簡単です。

```css
.popover {
  /* アンカーの下端から8pxの余白を取る */
  top: calc(anchor(bottom) + 8px);
  left: anchor(center);
  /* 中央揃え */
  translate: -50% 0;
}
```

## position-area プロパティ

アンカー周囲のエリアを指定する方法もあります。

```css
.popover {
  /* アンカーの下に配置 */
  position-area: block-end;
}
```

### よく使う値

| 値 | 配置位置 |
|----|---------|
| `block-start` | 上 |
| `block-end` | 下 |
| `inline-start` | 左（LTR）/ 右（RTL） |
| `inline-end` | 右（LTR）/ 左（RTL） |
| `center` | 中央 |

### 組み合わせ

```css
.popover {
  /* 右下に配置 */
  position-area: block-end inline-end;
}
```

**メリット**: `block-*` / `inline-*` は書字方向に準拠するため、多言語対応に優れています。

## 実践的なコード例

### ドロップダウンメニュー

```html
<button class="user-icon" popovertarget="user-menu">
  <img src="user-avatar.png" alt="ユーザーアイコン">
</button>

<div id="user-menu" class="dropdown-menu" popover>
  <ul>
    <li><a href="/profile">プロフィール</a></li>
    <li><a href="/settings">設定</a></li>
    <li><a href="/logout">ログアウト</a></li>
  </ul>
</div>
```

```css
.user-icon {
  anchor-name: --user-icon;
}

.dropdown-menu {
  position-anchor: --user-icon;
  top: anchor(bottom);
  right: anchor(right);
  margin-top: 8px;
}
```

右端揃えにすることで、画面右端でのはみ出しを防止します。

### サブメニューナビゲーション

```html
<nav>
  <button class="menu-item" popovertarget="task-submenu">
    タスク
  </button>
  <div id="task-submenu" class="submenu" popover>
    <a href="/tasks/new">新規作成</a>
    <a href="/tasks/list">一覧</a>
    <a href="/tasks/completed">完了済み</a>
  </div>
</nav>
```

```css
.menu-item {
  anchor-name: --task-menu;
}

.submenu {
  position-anchor: --task-menu;
  top: anchor(top);
  left: anchor(right);
  margin-left: 4px;
}
```

### ツールチップ

```html
<button class="help-button" popovertarget="help-tooltip">
  ?
</button>

<div id="help-tooltip" class="tooltip" popover>
  この機能についてのヘルプテキストです。
</div>
```

```css
.help-button {
  anchor-name: --help-button;
}

.tooltip {
  position-anchor: --help-button;
  bottom: anchor(top);
  left: anchor(center);
  translate: -50% -8px;

  /* スタイリング */
  background: #333;
  color: white;
  padding: 8px 12px;
  border-radius: 4px;
  font-size: 14px;
  max-width: 200px;
}
```

## ブラウザサポート状況

| ブラウザ | Anchor Positioning | Popover API |
|---------|-------------------|-------------|
| Chrome  | 125+ (2024年5月)  | 114+        |
| Edge    | 125+ (2024年5月)  | 114+        |
| Safari  | 26.0+ (2025年9月) | 17.0+       |
| Firefox | 147+ (2026年1月)  | 125+        |

**2026年1月現在、全モダンブラウザで利用可能です。**

### フォールバック

Anchor Positioning 非対応ブラウザ向けに `@supports` を使用できます。

```css
/* フォールバック: JavaScript で位置計算 */
.popover {
  position: fixed;
  /* JavaScript で設定 */
}

/* Anchor Positioning 対応ブラウザ */
@supports (anchor-name: --test) {
  .popover {
    position-anchor: --my-anchor;
    top: anchor(bottom);
    left: anchor(center);
  }
}
```

## Flash Translate への適用検討

### 現在の実装

Flash Translate では、テキスト選択位置に翻訳カードを表示するため、以下のJavaScript実装を使用しています：

- `calculateCardPosition()`: 選択テキストの `DOMRect` を基に位置計算
- ビューポート境界チェック
- 上下配置の自動切替（スペース不足時）
- `useResizable` / `useDraggable`: リサイズ・ドラッグ対応

```typescript
// 現在の実装例（card-position.ts）
export function calculateCardPosition(
  selectionRect: RectLike,
  options: CardPositionOptions,
  viewport: ViewportSize
): CardPosition {
  const x = calculateHorizontalPosition(/* ... */);
  const { y, placement, maxHeight } = calculateVerticalPosition(/* ... */);
  return { x, y, placement, maxHeight };
}
```

### 適用可能な箇所

1. **言語選択ドロップダウン**: ボタンに対して固定位置のドロップダウンなので、Anchor Positioning が適用可能
2. **設定メニュー**: 同様に固定アンカーに対するポップオーバー
3. **ツールチップ**: ヘルプアイコンなどに対するツールチップ

### 現時点での制限事項

**翻訳カード本体への適用は難しい理由**：

1. **動的なアンカー位置**: テキスト選択の位置は毎回変わるため、CSS の `anchor-name` で静的に定義できない
2. **Selection API との連携**: `window.getSelection()` から取得した `DOMRect` を CSS アンカーとして使用する標準的な方法がない
3. **ドラッグ機能**: ユーザーがカードをドラッグした後の位置を CSS で管理するのは複雑

### 将来的な可能性

- [CSS Anchor Positioning Level 2](https://drafts.csswg.org/css-anchor-position-2/) で動的アンカーのサポートが検討されています
- `anchor-scope` プロパティで、より柔軟なアンカー指定が可能になる予定

## 参考リンク

- [元記事: Anchor Positioning と Popover API（Zenn）](https://zenn.dev/ubie_dev/articles/anchor-positioning-popover)
- [MDN: CSS Anchor Positioning](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_anchor_positioning)
- [MDN: Popover API](https://developer.mozilla.org/en-US/docs/Web/API/Popover_API)
- [CSS Anchor Positioning 仕様書](https://drafts.csswg.org/css-anchor-position-1/)

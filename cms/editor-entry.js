import SUNEDITOR from 'suneditor';
import {
  align, backgroundColor, blockquote, blockStyle, codeBlock, font, fontColor,
  fontSize, hr, image, lineHeight, link, list, table,
} from 'suneditor/plugins';
import en from 'suneditor/langs/en';
import 'suneditor/css/editor';
import 'suneditor/css/contents';
import './editor.css';
import { renderMarkdown, sanitizeRichHtml, toMarkdown } from '../lib/article-content.cjs';

const CMS = window.CMS;
const h = window.h;
const createClass = window.createClass;
const asString = value => typeof value === 'string' ? value : '';
const escapeAttribute = value => String(value).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const htmlDocument = html => new DOMParser().parseFromString(html, 'text/html');
function editorHtml(html) {
  const parsed = htmlDocument(html);
  parsed.body.querySelectorAll('pre').forEach(pre => {
    // SunEditor compresses literal newlines in its input HTML. Its editing model
    // instead represents code line breaks with BR nodes. Build those nodes from
    // text so importing a fenced Markdown block cannot join its source lines.
    const language = `${pre.className} ${pre.querySelector('code')?.className || ''}`.match(/(?:^|\s)language-([a-z0-9_+-]{1,40})(?:\s|$)/i)?.[1];
    pre.querySelectorAll('br').forEach(br => br.replaceWith(parsed.createTextNode('\n')));
    const lines = pre.textContent.replace(/\r\n?/g, '\n').split('\n');
    const content = parsed.createDocumentFragment();
    lines.forEach((line, index) => {
      content.appendChild(parsed.createTextNode(line));
      if (index < lines.length - 1) content.appendChild(parsed.createElement('br'));
    });
    pre.replaceChildren(content);
    if (language) {
      pre.classList.add(`language-${language}`);
      pre.setAttribute('data-se-lang', language);
    }
  });
  return parsed.body.innerHTML;
}
const helpText = 'Chọn văn bản để định dạng. Dùng tiêu đề H2–H6 trong bài; tiêu đề bài viết đã là H1. Ảnh được lưu qua thư viện CMS.';

// Keep one rendering policy for the editing field and the public-site preview.
window.AldaArticleContent = Object.freeze({ renderMarkdown, sanitizeRichHtml, toMarkdown });

const language = {
  ...en,
  code: 'vi',
  align: 'Căn lề', alignLeft: 'Căn trái', alignCenter: 'Căn giữa',
  alignRight: 'Căn phải', alignJustify: 'Căn đều',
  bold: 'In đậm', italic: 'In nghiêng', underline: 'Gạch chân', strike: 'Gạch ngang',
  subscript: 'Chỉ số dưới', superscript: 'Chỉ số trên', undo: 'Hoàn tác', redo: 'Làm lại',
  formats: 'Kiểu đoạn', font: 'Phông chữ', fontSize: 'Cỡ chữ',
  fontColor: 'Màu chữ', backgroundColor: 'Màu nền chữ',
  removeFormat: 'Xóa định dạng', indent: 'Tăng thụt lề', outdent: 'Giảm thụt lề',
  list: 'Danh sách', lineHeight: 'Giãn dòng', blockquote: 'Trích dẫn',
  codeBlock: 'Hộp mã', codeLanguage: 'Ngôn ngữ mã',
  link: 'Liên kết', image: 'Ảnh', table: 'Bảng', hr: 'Đường phân cách',
  fullScreen: 'Toàn màn hình', showBlocks: 'Hiện khung các đoạn',
};

const plugins = { align, backgroundColor, blockquote, blockStyle, codeBlock, font, fontColor, fontSize, hr, image, lineHeight, link, list, table };
const toolbar = [
  ['undo', 'redo'], '|', ['blockStyle', 'font', 'fontSize'], '|',
  ['bold', 'italic', 'underline', 'strike', 'subscript', 'superscript'], '|',
  ['fontColor', 'backgroundColor', 'removeFormat'], '/',
  ['align', 'list', 'outdent', 'indent', 'lineHeight'], '|',
  ['blockquote', 'link', 'table', 'hr', 'codeBlock'], '|',
  ['fullScreen', 'showBlocks'],
];

const RichTextControl = createClass({
  getInitialState() {
    this.currentValue = asString(this.props.value);
    this.lastEmitted = null;
    this.lastHtml = '';
    this.assetUrls = new Map();
    this.controlID = `alda-image-${window.crypto.randomUUID()}`;
    this.ready = false;
    this.destroyed = false;
    this.sourceDirty = false;
    return { sourceMode: false, source: this.currentValue, pendingImage: null, imageAlt: '', notice: '', error: '' };
  },

  componentDidMount() {
    this.createEditor(this.currentValue);
  },

  componentDidUpdate(previous) {
    const value = asString(this.props.value);
    if (previous.value !== this.props.value) {
      if (value === this.lastEmitted) {
        this.currentValue = value;
      } else if (value !== this.currentValue) {
        // A new entry, external change or discard must replace the editor. Acknowledging
        // this field's own onChange must never replace its DOM or move the caret.
        this.currentValue = value;
        this.lastEmitted = null;
        this.sourceDirty = false;
        this.setState({ source: value, sourceMode: false, pendingImage: null, imageAlt: '', notice: '', error: '' });
        this.createEditor(value);
      }
    }

    const mediaPath = this.props.mediaPaths?.get(this.controlID);
    if (mediaPath) {
      this.props.onRemoveInsertedMedia?.(this.controlID);
      const path = Array.isArray(mediaPath) ? mediaPath[0] : mediaPath;
      if (typeof path === 'string') this.insertLibraryImage(path);
    }

    if (previous.getAsset !== this.props.getAsset && this.ready) this.refreshImagePreviews();
    if (previous.isDisabled !== this.props.isDisabled && this.ready) this.editor.$.ui.readOnly(Boolean(this.props.isDisabled));
  },

  componentWillUnmount() {
    this.destroyed = true;
    this.destroyEditor();
    this.props.onRemoveMediaControl?.(this.controlID);
  },

  destroyEditor() {
    this.ready = false;
    if (this.editor) this.editor.destroy();
    this.editor = null;
    this.savedRange = null;
    this.host?.replaceChildren();
  },

  createEditor(source) {
    this.destroyEditor();
    if (!this.host || this.destroyed) return;
    const target = document.createElement('textarea');
    target.setAttribute('aria-label', 'Nội dung bài viết');
    this.host.appendChild(target);
    const cleanHtml = renderMarkdown(source);
    const editorValue = editorHtml(this.resolveImages(cleanHtml));
    this.lastHtml = cleanHtml;
    this.editor = SUNEDITOR.create(target, {
      plugins,
      lang: language,
      value: editorValue,
      buttonList: toolbar,
      width: '100%', height: 'auto', minHeight: '360px', maxHeight: '720px',
      toolbar_sticky: -1,
      placeholder: 'Bắt đầu viết nội dung bài viết…',
      defaultStyle: 'font-family: Arial, sans-serif; font-size: 16px; line-height: 1.7;',
      blockStyle: { items: ['p', 'h2', 'h3', 'h4', 'h5', 'h6'] },
      align: { items: ['left', 'center', 'right', 'justify'] },
      lineHeight: { items: [{ text: '1', value: '1' }, { text: '1.5', value: '1.5' }, { text: '1.7', value: '1.7' }, { text: '2', value: '2' }] },
      image: { createFileInput: false, canResize: true, allowMultiple: false },
      elementBlacklist: 'script|style|iframe|audio|video|object|embed|svg|form|input|button',
      events: {
        onload: ({ $ }) => {
          if (this.destroyed || this.editor?.$ !== $) return;
          this.ready = true;
          const editable = $.frameContext.get('wysiwyg');
          editable.setAttribute('aria-label', 'Nội dung bài viết — văn bản định dạng');
          editable.setAttribute('aria-describedby', `${this.props.forID}-richtext-help`);
          // SunEditor may normalize valid HTML on initialization. Opening an old
          // Markdown article must not create an edit, even if its HTML normalizes.
          this.lastHtml = sanitizeRichHtml(this.publicImagePaths(editable.innerHTML));
          this.refreshImagePreviews();
          $.ui.readOnly(Boolean(this.props.isDisabled));
        },
        onInput: () => this.queueEditorChange(),
        onChange: ({ data }) => this.emitEditorChange(data),
        onBlur: () => this.emitEditorChange(),
        onImageUploadBefore: () => {
          this.setState({ notice: 'Dùng “Thư viện ảnh” để tải và chèn ảnh qua CMS.' });
          return false;
        },
      },
    });
  },

  queueEditorChange() {
    // onInput runs before SunEditor's delayed history change. Store text immediately
    // so clicking Publish directly after typing does not omit the last keystrokes.
    queueMicrotask(() => {
      if (!this.destroyed) this.emitEditorChange();
    });
  },

  publicImagePaths(html) {
    const parsed = htmlDocument(html);
    parsed.body.querySelectorAll('img[src]').forEach(img => {
      const source = img.getAttribute('src');
      if (this.assetUrls.has(source)) img.setAttribute('src', this.assetUrls.get(source));
    });
    return parsed.body.innerHTML;
  },

  resolveImages(html) {
    return previewImages(html, this.props.getAsset, this.props.field, this.assetUrls);
  },

  refreshImagePreviews() {
    const editable = this.editor?.$?.frameContext.get('wysiwyg');
    if (!editable) return;
    // Only src changes; preserving the current editing DOM keeps selection intact.
    editable.querySelectorAll('img[src]').forEach(img => {
      const current = img.getAttribute('src');
      const publicPath = this.assetUrls.get(current) || current;
      const parsed = htmlDocument(this.resolveImages(`<img src="${escapeAttribute(publicPath)}">`));
      const preview = parsed.body.querySelector('img')?.getAttribute('src');
      if (preview && preview !== current) img.setAttribute('src', preview);
    });
  },

  emitEditorChange(html) {
    if (!this.ready || this.destroyed || this.state.sourceMode || this.props.isDisabled) return;
    const raw = typeof html === 'string' ? html : this.editor?.$?.frameContext.get('wysiwyg')?.innerHTML;
    if (typeof raw !== 'string') return;
    const safeHtml = sanitizeRichHtml(this.publicImagePaths(raw));
    if (safeHtml === this.lastHtml) return;
    this.lastHtml = safeHtml;
    const source = toMarkdown(safeHtml);
    if (source === this.currentValue) return;
    this.currentValue = source;
    this.lastEmitted = source;
    this.props.onChange(source);
  },

  rememberSelection(event) {
    if (event) event.preventDefault();
    try { this.savedRange = this.editor.$.selection.getRange().cloneRange(); } catch { this.savedRange = null; }
  },

  openMediaLibrary() {
    if (!this.ready || this.state.sourceMode || this.props.isDisabled || !this.props.onOpenMediaLibrary) return;
    this.rememberSelection();
    this.props.onOpenMediaLibrary({
      controlID: this.controlID,
      forImage: true,
      allowMultiple: false,
      field: this.props.field,
    });
  },

  insertLibraryImage(path) {
    if (!this.ready || this.destroyed || this.props.isDisabled) return;
    // Decap provides the public repository path here, including freshly uploaded
    // media. A preview blob may be shown in the editor, but it is never serialized.
    const safe = sanitizeRichHtml(`<img src="${escapeAttribute(path)}" alt="">`);
    if (!htmlDocument(safe).body.querySelector('img[src]')) {
      this.setState({ notice: 'Không thể chèn ảnh này. Chọn ảnh từ thư viện CMS.' });
      return;
    }
    this.setState({ pendingImage: path, imageAlt: '', notice: '' });
  },

  updateImageAlt(event) {
    this.setState({ imageAlt: event.target.value });
  },

  confirmLibraryImage() {
    const path = this.state.pendingImage;
    if (!path || !this.ready || this.destroyed || this.props.isDisabled) return;
    const alt = this.state.imageAlt;
    const html = this.resolveImages(sanitizeRichHtml(`<img src="${escapeAttribute(path)}" alt="${escapeAttribute(alt)}">`));
    const $ = this.editor.$;
    $.focusManager.focus();
    if (this.savedRange && $.frameContext.get('wysiwyg').contains(this.savedRange.startContainer)) $.selection.setRange(this.savedRange);
    $.html.insert(html);
    this.savedRange = null;
    this.emitEditorChange();
    this.setState({ pendingImage: null, imageAlt: '', notice: 'Đã chèn ảnh. Ảnh dùng đường dẫn của thư viện CMS.' });
  },

  cancelLibraryImage() {
    this.savedRange = null;
    this.setState({ pendingImage: null, imageAlt: '', notice: '' });
  },

  openSource() {
    this.emitEditorChange();
    this.sourceDirty = false;
    this.setState({ sourceMode: true, source: this.currentValue, notice: '', error: '' });
  },

  updateSource(event) {
    this.sourceDirty = event.target.value !== this.currentValue;
    this.setState({ source: event.target.value, error: '' });
  },

  applySource() {
    const source = this.sourceDirty ? toMarkdown(renderMarkdown(this.state.source)) : this.currentValue;
    const changed = source !== this.currentValue;
    this.currentValue = source;
    this.sourceDirty = false;
    this.setState({ sourceMode: false, source, notice: 'Đã áp dụng mã nguồn. HTML không được hỗ trợ đã được loại bỏ.', error: '' });
    this.createEditor(source);
    if (changed) {
      this.lastEmitted = source;
      this.props.onChange(source);
    }
  },

  cancelSource() {
    this.sourceDirty = false;
    this.setState({ sourceMode: false, source: this.currentValue, notice: '', error: '' });
  },

  isValid() {
    if (this.state.pendingImage) return { error: { message: 'Bấm “Chèn ảnh” hoặc “Hủy” trước khi lưu bài.' } };
    if (this.state.sourceMode && this.sourceDirty) return { error: { message: 'Bấm “Áp dụng mã nguồn” hoặc “Hủy thay đổi mã nguồn” trước khi lưu bài.' } };
    if (this.props.field?.get('required', true) === false) return true;
    const doc = htmlDocument(renderMarkdown(this.currentValue));
    if (doc.body.textContent.replace(/[\s\u200b\ufeff]/g, '') || doc.body.querySelector('img[src]')) return true;
    return { error: { message: 'Nhập nội dung bài viết trước khi lưu.' } };
  },

  render() {
    const sourceMode = this.state.sourceMode;
    return h('div', { className: `alda-richtext ${this.props.classNameWrapper || ''}` },
      h('div', { className: 'alda-richtext-actions' },
        h('span', { className: 'alda-richtext-mode' }, sourceMode ? 'Mã nguồn Markdown + HTML' : 'Văn bản định dạng'),
        !sourceMode && h('button', { type: 'button', className: 'alda-editor-action', disabled: this.props.isDisabled || Boolean(this.state.pendingImage), onMouseDown: this.rememberSelection, onClick: this.openMediaLibrary }, 'Thư viện ảnh'),
        !sourceMode && h('button', { type: 'button', className: 'alda-editor-action', disabled: Boolean(this.state.pendingImage), onClick: this.openSource }, 'Mã nguồn'),
      ),
      h('p', { className: 'alda-richtext-help', id: `${this.props.forID}-richtext-help` }, helpText),
      this.state.pendingImage && h('div', { className: 'alda-richtext-image-form' },
        h('p', { className: 'alda-richtext-image-path' }, this.state.pendingImage),
        h('label', { htmlFor: `${this.props.forID}-image-alt` }, 'Mô tả nội dung ảnh (alt text)'),
        h('input', { id: `${this.props.forID}-image-alt`, type: 'text', value: this.state.imageAlt, onChange: this.updateImageAlt, disabled: this.props.isDisabled, placeholder: 'Mô tả ngắn gọn nội dung ảnh' }),
        h('p', { className: 'alda-richtext-help' }, 'Mô tả giúp người đọc dùng trình đọc màn hình và công cụ tìm kiếm hiểu ảnh. Có thể để trống nếu ảnh chỉ để trang trí.'),
        h('div', { className: 'alda-richtext-source-actions' },
          h('button', { type: 'button', className: 'alda-editor-action alda-editor-primary', disabled: this.props.isDisabled, onClick: this.confirmLibraryImage }, 'Chèn ảnh'),
          h('button', { type: 'button', className: 'alda-editor-action', onClick: this.cancelLibraryImage }, 'Hủy'),
        ),
      ),
      h('div', { className: 'alda-richtext-editor', hidden: sourceMode, ref: element => { this.host = element; } }),
      sourceMode && h('div', { className: 'alda-richtext-source' },
        h('p', { className: 'alda-richtext-help' }, 'Sửa Markdown hoặc HTML được hỗ trợ. Màu và căn lề được giữ bằng HTML. Hộp mã trong bài được chèn bằng nút “Hộp mã”; khung này là mã nguồn toàn bài.'),
        h('textarea', { id: this.props.forID, 'aria-label': 'Mã nguồn nội dung bài viết', spellCheck: false, readOnly: this.props.isDisabled, value: this.state.source, onChange: this.updateSource }),
        h('div', { className: 'alda-richtext-source-actions' },
          h('button', { type: 'button', className: 'alda-editor-action alda-editor-primary', onClick: this.applySource }, 'Áp dụng mã nguồn'),
          h('button', { type: 'button', className: 'alda-editor-action', onClick: this.cancelSource }, 'Hủy thay đổi mã nguồn'),
        ),
      ),
      h('p', { className: 'alda-richtext-status', role: 'status', 'aria-live': 'polite' }, this.state.notice || this.state.error),
    );
  },
});

function previewImages(html, getAsset, field, assetUrls = new Map()) {
  const parsed = htmlDocument(html);
  parsed.body.querySelectorAll('img[src]').forEach(img => {
    const source = img.getAttribute('src');
    if (!source || !getAsset || /^(?:https?:|blob:|data:)/i.test(source)) return;
    try {
      const asset = getAsset(source, field);
      const preview = asset?.toString();
      if (preview && preview !== '[object Object]' && /^(?:https?:|blob:|\/)/i.test(preview)) {
        if (preview !== source) assetUrls.set(preview, source);
        img.setAttribute('src', preview);
      }
    } catch { /* The repository URL remains usable while Decap resolves an asset. */ }
  });
  return parsed.body.innerHTML;
}

const RichTextPreview = createClass({
  render() {
    const html = renderMarkdown(asString(this.props.value));
    return h('div', {
      className: 'alda-article-content',
      dangerouslySetInnerHTML: { __html: previewImages(html, this.props.getAsset, this.props.field) },
    });
  },
});

CMS.registerWidget('alda-richtext', RichTextControl, RichTextPreview);

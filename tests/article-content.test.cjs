const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { spawnSync } = require('node:child_process');
const MarkdownIt = require('markdown-it');
const { renderMarkdown, sanitizeRichHtml, toMarkdown } = require('../lib/article-content.cjs');

const root = path.resolve(__dirname, '..');
const textOf = html => html.replace(/<[^>]*>/g, ' ')
  .replace(/&(?:quot|apos|amp|lt|gt|#39|#x27);/gi, value => ({ '&quot;': '"', '&apos;': "'", '&amp;': '&', '&lt;': '<', '&gt;': '>', '&#39;': "'", '&#x27;': "'" })[value.toLowerCase()])
  .replace(/\s+/g, ' ').trim();

test('legacy Markdown articles retain their text and semantic structures without source migration', () => {
  const previous = new MarkdownIt({ html: false }).disable('code');
  const posts = fs.readdirSync(path.join(root, 'blog')).filter(file => file.endsWith('.md'));
  assert.ok(posts.length >= 14);
  for (const filename of posts) {
    const source = fs.readFileSync(path.join(root, 'blog', filename), 'utf8');
    const body = source.replace(/^---\r?\n[\s\S]*?\r?\n---(?:\r?\n|$)/, '');
    const before = previous.render(body);
    const after = renderMarkdown(body);
    assert.equal(textOf(after), textOf(before), `${filename}: article text is preserved`);
    for (const tag of ['h2', 'h3', 'ul', 'ol', 'li', 'strong', 'em', 'a', 'img', 'table', 'pre', 'code']) {
      const count = value => [...value.matchAll(new RegExp(`<${tag}(?:\\s|>)`, 'g'))].length;
      assert.equal(count(after), count(before), `${filename}: ${tag} structure is preserved`);
    }
  }
});

test('ordinary editor content serializes as readable Markdown including headings, lists, links and simple tables', () => {
  const source = toMarkdown('<h2>Growth decisions</h2><p>A <strong>clear</strong> <em>priority</em> and <a href="https://example.com/report">report</a>.</p><ul><li>Measure demand</li><li>Review conversion</li></ul><table><thead><tr><th>Channel</th><th>Leads</th></tr></thead><tbody><tr><td>SEO</td><td>12</td></tr></tbody></table>');
  assert.match(source, /^## Growth decisions/m);
  assert.match(source, /\*\*clear\*\*/);
  assert.match(source, /\*priority\*/);
  assert.match(source, /\[report\]\(https:\/\/example\.com\/report\)/);
  assert.match(source, /^-\s+Measure demand/m);
  assert.match(source, /\| Channel \| Leads \|/);
  assert.ok(!source.includes('<p>') && !source.includes('<table>'), 'Standard content stays ordinary Markdown');
  const html = renderMarkdown(source);
  assert.match(html, /<h2>Growth decisions<\/h2>/);
  assert.match(html, /<table>/);
  assert.match(html, /<td>SEO<\/td>/);
});

test('rich formatting survives editor HTML to Markdown to public HTML and a second edit', () => {
  const rich = [
    '<h1 style="text-align:center;color:#3d4a33">Rich heading</h1>',
    '<p style="text-align:justify;line-height:1.5;margin-left:25px">A <span style="color:rgb(25, 28, 24);background-color:#d3ed84;font-size:24px;font-family:Arial">highlighted</span> paragraph with <u>underline</u>, H<sub>2</sub>O and x<sup>2</sup>.</p>',
    '<p style="text-align:right">Right aligned</p><p style="text-align:left">Left aligned</p>',
    '<table style="width:100%;border:1px solid #191c18"><colgroup><col style="width:120px"></colgroup><tbody><tr><td colspan="2" style="text-align:center;background-color:#d3ed84;border-style:dashed;border-width:2px;border-color:rgb(25, 28, 24)">Merged cells</td></tr></tbody></table>',
    '<p><img src="/images/blog/chart.jpg" alt="Quarterly growth &amp; demand" width="640"></p>',
  ].join('');
  const source = toMarkdown(rich);
  assert.match(source, /<p style="text-align:justify;line-height:1\.5;margin-left:25px">/);
  assert.match(source, /<table/);
  const rendered = renderMarkdown(source);
  const editedAgain = renderMarkdown(toMarkdown(rendered));
  for (const html of [rendered, editedAgain]) {
    assert.match(html, /<h2[^>]*text-align:center/);
    assert.ok(!/<h1\b/.test(html), 'The page template owns the only H1');
    for (const alignment of ['left', 'center', 'right', 'justify']) assert.ok(html.includes(`text-align:${alignment}`));
    assert.ok(html.includes('color:rgb(25, 28, 24)') && html.includes('background-color:#d3ed84'));
    assert.ok(html.includes('font-size:24px') && html.includes('font-family:Arial'));
    assert.match(html, /<u>underline<\/u>/);
    assert.match(html, /H<sub>2<\/sub>O/);
    assert.match(html, /x<sup>2<\/sup>/);
    assert.match(html, /<td[^>]*colspan="2"/);
    assert.ok(html.includes('border:1px solid #191c18') && html.includes('border-style:dashed'));
    assert.match(html, /<img[^>]*src="\/images\/blog\/chart.jpg"[^>]*alt="Quarterly growth &amp; demand"[^>]*width="640"/);
  }
});

test('code boxes become fenced Markdown while script examples and fence characters remain literal', () => {
  const code = '<script>alert("example")</script>\nconst fence = "```";\n\n';
  const escaped = code.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  for (const html of [`<pre class="language-js">${escaped}</pre>`, `<pre><code class="language-js">${escaped}</code></pre>`]) {
    const source = toMarkdown(html);
    assert.match(source, /^````js\n/);
    assert.ok(source.includes(code), 'Source contains readable code without HTML entity conversion');
    const rendered = renderMarkdown(source);
    assert.match(rendered, /<pre><code class="language-js">/);
    assert.ok(rendered.includes('&lt;script&gt;alert("example")&lt;/script&gt;'));
    assert.ok(!rendered.includes('<script>'));
    assert.equal(renderMarkdown(toMarkdown(rendered)), rendered, 'Opening and saving again preserves code exactly');
  }
  const editableLines = toMarkdown('<pre class="language-js">const one = 1;<br>const two = 2;<br><br>done();</pre>');
  assert.ok(editableLines.includes('const one = 1;\nconst two = 2;\n\ndone();'), 'Editable <br> code lines retain their line breaks');
  const changedLanguage = toMarkdown('<pre class="language-javascript" data-se-lang="python">print(&quot;hello&quot;)<br>print(&quot;world&quot;)</pre>');
  assert.match(changedLanguage, /^```python\n/, 'The language picker takes precedence over a stale imported class');
  assert.match(renderMarkdown(changedLanguage), /<code class="language-python">/);
  assert.ok(!sanitizeRichHtml('<pre data-se-lang="js&quot; onclick=&quot;bad()">code</pre>').includes('data-se-lang='), 'Language metadata accepts a strict token rather than arbitrary attribute content');
});

test('the shared renderer removes executable markup, unsafe URLs and arbitrary styling in editor and Markdown input', () => {
  const malicious = [
    '<script>window.bad=true</script><style>body{display:none}</style>',
    '<svg onload="alert(1)"><circle/></svg><iframe src="https://example.com"></iframe><object data="x"></object>',
    '<p class="site-header" id="injected" onclick="alert(1)" style="color:#191c18;position:fixed;background-image:url(javascript:alert(1));font-size:999px;margin-left:9999px">Safe text</p>',
    '<a href="jav&#x61;script:alert(1)" target="_blank">Unsafe link</a>',
    '<a href="java&#x09;script:alert(1)">Control scheme</a>',
    '<img src="data:image/svg+xml,bad" onerror="alert(1)" alt="Safe image text">',
    '<img src="blob:https://aldahub.com/unsaved">',
    '<img src="//example.com/relative.jpg">',
  ].join('');
  for (const html of [sanitizeRichHtml(malicious), renderMarkdown(malicious), renderMarkdown(toMarkdown(malicious))]) {
    assert.ok(html.includes('Safe text'));
    assert.ok(!/<(?:script|style|svg|iframe|object)\b/i.test(html));
    assert.ok(!/\s(?:onclick|onerror|onload|id|class)=["'](?:site-header|injected|alert)/i.test(html));
    assert.ok(!/position|background-image|999px|9999px|javascript:|data:image|blob:|\/\/example\.com\/relative/.test(html));
    assert.ok(!/href="java/i.test(html));
  }
  const links = sanitizeRichHtml('<a href="https://example.com" target="_blank" rel="opener nofollow">Report</a><a href="/services/">Services</a><a href="mailto:hello@example.com">Email</a>');
  assert.match(links, /rel="nofollow noopener noreferrer"/);
  assert.ok(links.includes('href="/services/"') && links.includes('href="mailto:hello@example.com"'));
});

test('an authored rich article produces sanitized static HTML and loads its article stylesheet', { timeout: 45000 }, () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'aldahub-rich-article-'));
  try {
    for (const name of ['package.json', 'eleventy.config.js', 'scripts', 'lib', 'src', 'blog', 'cms']) {
      const source = path.join(root, name);
      if (fs.existsSync(source)) fs.cpSync(source, path.join(directory, name), { recursive: true });
    }
    for (const name of ['assets', 'images', 'admin', 'uploads', 'node_modules']) {
      const source = path.join(root, name);
      if (fs.existsSync(source)) fs.symlinkSync(source, path.join(directory, name), 'dir');
    }
    const body = toMarkdown('<h2>Rich editorial fixture</h2><p style="text-align:justify">A <span style="color:#3d4a33">measured</span> outcome.</p><pre class="language-html">&lt;script&gt;example()&lt;/script&gt;</pre><p onclick="bad()">Useful content.</p>');
    fs.writeFileSync(path.join(directory, 'blog', 'rich-editor-fixture.md'), [
      '---', 'title: Rich editor fixture', 'date: 2026-01-01T09:00:00+07:00',
      'description: An integration check for authoring rich content in Markdown.', 'author: AldaHub',
      'draft: false', 'tags:', '  - Editorial fixture', '---', body, '',
    ].join('\n'));
    const result = spawnSync(process.execPath, [path.join(directory, 'scripts', 'build.cjs'), '--quiet'], {
      cwd: directory, encoding: 'utf8', timeout: 30000,
      env: { ...process.env, CONTEXT: 'production', NETLIFY: 'true', VERCEL_ENV: '' },
    });
    assert.equal(result.status, 0, `${result.error || ''}\n${result.stdout}\n${result.stderr}`);
    const html = fs.readFileSync(path.join(directory, '_site', 'blog', 'rich-editor-fixture', 'index.html'), 'utf8');
    assert.match(html, /<p style="text-align:justify">A <span style="color:#3d4a33">measured<\/span> outcome\.<\/p>/);
    assert.ok(html.includes('&lt;script&gt;example()&lt;/script&gt;'));
    assert.ok(!html.includes('onclick="bad()"') && !html.includes('<script>example()'));
    assert.equal([...html.matchAll(/<h1\b/g)].length, 1);
    assert.match(html, /href="\/assets\/article-content\.css\?v=[a-f0-9]+"/);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

(() => {
  'use strict';

  // Decap must wait until the editor is requested and custom previews are registered.
  window.CMS_MANUAL_INIT = true;

  const welcome = document.querySelector('#admin-welcome');
  const loginPanel = document.querySelector('.admin-login');
  const cmsRoot = document.querySelector('#nc-root');
  const status = document.querySelector('#admin-status');
  const userLabel = document.querySelector('#admin-user');
  const loginButton = document.querySelector('#admin-login');
  const enterButton = document.querySelector('#admin-enter');
  const logoutButton = document.querySelector('#admin-logout');
  const retryButton = document.querySelector('#admin-retry');
  const authCallback = /(?:^#\/?|&)(?:(?:invite|recovery|confirmation|email_change)_token|access_token)=/.test(window.location.hash);
  let identity;
  let editorStarting = false;
  let editorStarted = false;
  let dependencyFailed = false;

  const setStatus = (message, error = false) => {
    status.textContent = message;
    status.dataset.error = String(error);
  };

  const showSession = user => {
    loginPanel.setAttribute('aria-busy', 'false');
    loginButton.disabled = false;
    loginButton.hidden = Boolean(user);
    enterButton.hidden = !user;
    logoutButton.hidden = !user;
    userLabel.hidden = !user;
    userLabel.textContent = user ? `Đã đăng nhập: ${user.email || 'Tài khoản Alda Hub'}` : '';
    setStatus(user ? 'Phiên đăng nhập đã sẵn sàng. Tiếp tục để quản lý nội dung.' : 'Sẵn sàng đăng nhập. Chỉ tài khoản có quyền trên website mới truy cập được nội dung.');
  };

  // Reload on retry instead of creating a second Identity widget or CMS instance.
  const showLoadError = message => {
    loginPanel.setAttribute('aria-busy', 'false');
    setStatus(message, true);
    retryButton.hidden = false;
  };

  const loadScript = src => new Promise((resolve, reject) => {
    const script = document.createElement('script');
    const timer = window.setTimeout(() => fail(), 20000);
    const fail = () => {
      window.clearTimeout(timer);
      script.onload = script.onerror = null;
      script.remove();
      reject(new Error('Could not load CMS dependency'));
    };
    script.src = src;
    script.onload = () => {
      window.clearTimeout(timer);
      script.onload = script.onerror = null;
      resolve();
    };
    script.onerror = fail;
    document.head.appendChild(script);
  });

  const enterEditor = async () => {
    if (editorStarting || editorStarted) return;
    editorStarting = true;
    enterButton.disabled = true;
    logoutButton.disabled = true;
    loginPanel.setAttribute('aria-busy', 'true');
    setStatus('Đang tải trình biên tập…');
    try {
      await loadScript('/admin/editor.js');
      await loadScript('/admin/preview.js');
      // No config override: git-gateway, accounts, permissions and main remain in config.yml.
      window.CMS.init();
      editorStarted = true;
      welcome.hidden = true;
      cmsRoot.hidden = false;
      document.body.classList.add('admin-editor-open');
    } catch {
      showLoadError('Không tải được trình biên tập. Kiểm tra kết nối hoặc trình chặn nội dung, sau đó bấm Thử tải lại.');
    } finally {
      editorStarting = false;
      enterButton.disabled = false;
      logoutButton.disabled = false;
    }
  };

  loginButton.addEventListener('click', () => {
    if (!identity) return;
    setStatus('Hoàn tất đăng nhập trong cửa sổ Netlify Identity.');
    identity.open('login');
  });
  enterButton.addEventListener('click', enterEditor);
  logoutButton.addEventListener('click', async () => {
    logoutButton.disabled = true;
    try { await identity.logout(); }
    catch { showLoadError('Chưa đăng xuất được. Kiểm tra kết nối và thử tải lại.'); }
    finally { logoutButton.disabled = false; }
  });
  retryButton.addEventListener('click', () => window.location.reload());

  const dependencyTimeout = window.setTimeout(() => {
    dependencyFailed = true;
    showLoadError('Kết nối dịch vụ đăng nhập quá lâu. Kiểm tra kết nối hoặc trình chặn nội dung, sau đó bấm Thử tải lại.');
  }, 20000);
  document.addEventListener('error', event => {
    if (!['admin-identity-script', 'admin-cms-script'].includes(event.target?.id)) return;
    dependencyFailed = true;
    window.clearTimeout(dependencyTimeout);
    showLoadError('Không tải được dịch vụ đăng nhập hoặc CMS. Kiểm tra kết nối hoặc trình chặn nội dung, sau đó bấm Thử tải lại.');
  }, true);

  // This handler is registered before the widget's DOMContentLoaded auto-init.
  // Decap's script must also load before that event, so it sees the same init.
  document.addEventListener('DOMContentLoaded', () => {
    window.clearTimeout(dependencyTimeout);
    if (dependencyFailed) return;
    if (!window.netlifyIdentity || !window.CMS?.init) {
      showLoadError('Dịch vụ đăng nhập hoặc CMS chưa sẵn sàng. Bấm Thử tải lại để kết nối lại.');
      return;
    }
    identity = window.netlifyIdentity;
    identity.on('init', showSession);
    identity.on('login', user => {
      showSession(user);
      identity.close();
      enterEditor();
    });
    identity.on('logout', () => {
      // A fresh page clears editor state after Decap's own logout flow.
      if (editorStarted) { window.location.replace('/admin/'); return; }
      showSession(null);
    });
    identity.on('error', () => {
      showLoadError('Netlify Identity chưa hoàn tất yêu cầu. Kiểm tra thông báo trong cửa sổ đăng nhập; nếu liên kết email đã hết hạn, hãy yêu cầu liên kết mới.');
    });
    identity.on('close', () => {
      if (!editorStarting && !editorStarted) showSession(identity.currentUser());
    });
    // The widget auto-initializes. Never call init() a second time.
    showSession(identity.currentUser());
    if (authCallback) setStatus('Đang mở liên kết bảo mật. Hoàn tất bước xác nhận hoặc đặt mật khẩu trong cửa sổ Netlify Identity.');
  }, { once: true });
})();

function includeHTML() {
  const elements = document.querySelectorAll('[data-include]');
  console.log('Found include elements:', elements.length);
  
  elements.forEach(el => {
    const file = el.getAttribute('data-include');
    console.log('Loading include file:', file);
    
    fetch(`includes/${file}`)
      .then(response => {
        if (!response.ok) throw new Error(`Could not load ${file}: ${response.status}`);
        return response.text();
      })
      .then(data => {
        el.innerHTML = data;
        console.log(`Successfully loaded: ${file}`);
        
        // RE-INIT CÁC SCRIPTS SAU KHI LOAD NAVBAR/FOOTER
        if (typeof initNavbar === 'function') initNavbar();
        if (typeof initFooter === 'function') initFooter();
      })
      .catch(err => {
        console.error(`Error loading ${file}:`, err);
        el.innerHTML = `<p>Error loading ${file}</p>`;
      });
  });
}

document.addEventListener('DOMContentLoaded', includeHTML);

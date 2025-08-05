function includeHTML() {
  const elements = document.querySelectorAll('[data-include]');
  elements.forEach(el => {
    const file = el.getAttribute('data-include');
    fetch(`_includes/${file}`)
      .then(response => {
        if (!response.ok) throw new Error(`Could not load ${file}`);
        return response.text();
      })
      .then(data => el.innerHTML = data)
      .catch(err => el.innerHTML = `<p>Error loading ${file}</p>`);
  });
}

document.addEventListener('DOMContentLoaded', includeHTML);

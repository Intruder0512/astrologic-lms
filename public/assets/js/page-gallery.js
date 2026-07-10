document.addEventListener('DOMContentLoaded', () => {
  const grid = document.getElementById('gallery-grid');
  const lightbox = document.getElementById('lightbox');
  const lightboxImg = document.getElementById('lightbox-img');

  grid.addEventListener('click', (e) => {
    const item = e.target.closest('.gallery-item img');
    if (!item) return;
    lightboxImg.src = item.src;
    lightboxImg.alt = item.alt;
    lightbox.classList.add('open');
  });

  lightbox.addEventListener('click', () => {
    lightbox.classList.remove('open');
    lightboxImg.src = '';
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      lightbox.classList.remove('open');
      lightboxImg.src = '';
    }
  });
});

// review.js – Supabase reviews + star rating (sync with CDN)
// Global Supabase client instance (named supabaseClient) to avoid overwriting the library
if (!window.supabase) {
  console.error('Supabase CDN script not loaded');
}
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/**
 * Load existing reviews from Supabase
 */
async function loadReviews() {
  const { data, error } = await supabaseClient
    .from('reviews')
    .select('*')
    .order('created_at', { ascending: false });

  const container = document.getElementById('reviews-list');
  if (!container) return;
  container.innerHTML = '';

  if (error) {
    console.error('Error loading reviews:', error);
    container.innerHTML = '<p>Gagal memuat review.</p>';
    return;
  }

  data.forEach(r => {
    const div = document.createElement('div');
    div.className = 'review-item';
    const stars = '★'.repeat(r.rating) + '☆'.repeat(5 - r.rating);
    div.innerHTML = `<strong>${r.name}</strong> <span class="review-stars">${stars}</span><p>${r.comment}</p>`;
    container.appendChild(div);
  });
}

/**
 * Submit a new review
 */
async function submitReview(event) {
  event.preventDefault();
  const form = event.target;
  const name = form['review-name']?.value.trim();
  const ratingInput = form['review-rating'];
  const rating = ratingInput ? parseInt(ratingInput.value, 10) : null;
  const comment = form['review-comment']?.value.trim();

  if (!name || !rating || !comment) {
    alert('Harap isi semua bidang');
    return;
  }

  const { error } = await supabaseClient
    .from('reviews')
    .insert({ name, rating, comment });

  if (error) {
    console.error('Submit error:', error);
    alert('Gagal mengirim review');
  } else {
    alert('Review berhasil dikirim');
    form.reset();
    resetStars();
    loadReviews();
  }
}

/**
 * Star rating UI – click to set rating
 */
function resetStars() {
  const stars = document.querySelectorAll('.review-form .star-rating .fa-star');
  stars.forEach(s => s.classList.remove('active'));
  const ratingInput = document.getElementById('review-rating');
  if (ratingInput) ratingInput.value = '';
}

function initStarRating() {
  const stars = document.querySelectorAll('.review-form .star-rating .fa-star');
  const ratingInput = document.getElementById('review-rating');

  if (!stars.length || !ratingInput) return;

  stars.forEach(star => {
    star.addEventListener('click', () => {
      const val = parseInt(star.dataset.value, 10);
      ratingInput.value = val;
      stars.forEach(s => s.classList.toggle('active', parseInt(s.dataset.value, 10) <= val));
    });
  });
}

window.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('review-form');
  if (form) form.addEventListener('submit', submitReview);

  initStarRating();
  loadReviews();
});
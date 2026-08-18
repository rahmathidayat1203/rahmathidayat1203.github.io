// review.js – Supabase reviews + star rating (sync with CDN)
// Global Supabase client instance (named supabaseClient) to avoid overwriting the library
const SUPABASE_URL = "https://ggtphjckjvdyjztzzqik.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdndHBoamNranZkeWp6dHp6cWlrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY4OTA1MTAsImV4cCI6MjEwMjQ2NjUxMH0.kpL41mBRdYer8WCIJzhzhzI6IAfUcDdEdjIIA0W2XXE";

if (!window.supabase) {
  console.error('Supabase CDN script not loaded');
}
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const REVIEW_IMAGE_BUCKET = 'review-images';
const MAX_IMAGE_BYTES = 3 * 1024 * 1024; // 3MB
const ALLOWED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp'];

/**
 * Load top-rated reviews into the Testimonials section
 */
async function loadTestimonials() {
  const container = document.getElementById('testimonials-list');
  if (!container) return;

  const { data, error } = await supabaseClient
    .from('reviews')
    .select('*')
    .gte('rating', 4)
    .order('rating', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(3);

  container.innerHTML = '';

  if (error) {
    console.error('Error loading testimonials:', error);
    container.innerHTML = '<p>Gagal memuat testimonial.</p>';
    return;
  }

  if (!data.length) {
    container.innerHTML = '<p>Belum ada testimonial. Jadilah yang pertama memberi review!</p>';
    return;
  }

  data.forEach(r => {
    const card = document.createElement('div');
    card.className = 'testimonial-card';

    const imageWrap = document.createElement('div');
    imageWrap.className = 'testimonial-image';
    if (r.image_url) {
      const img = document.createElement('img');
      img.src = r.image_url;
      img.alt = r.name;
      img.width = 84;
      img.height = 84;
      img.loading = 'lazy';
      img.decoding = 'async';
      imageWrap.appendChild(img);
    } else {
      imageWrap.classList.add('testimonial-image--placeholder');
      imageWrap.textContent = (r.name || '?').trim().charAt(0).toUpperCase();
    }

    const name = document.createElement('div');
    name.className = 'testimonial-name';
    name.textContent = r.name;

    const ratingRow = document.createElement('div');
    ratingRow.className = 'testimonial-rating';
    ratingRow.setAttribute('role', 'img');
    ratingRow.setAttribute('aria-label', `${r.rating} out of 5 stars`);
    for (let i = 0; i < 5; i++) {
      const star = document.createElement('i');
      star.className = i < r.rating ? 'fas fa-star' : 'far fa-star';
      star.setAttribute('aria-hidden', 'true');
      ratingRow.appendChild(star);
    }

    const text = document.createElement('p');
    text.className = 'testimonial-text';
    text.textContent = r.comment;

    card.append(imageWrap, name, ratingRow, text);
    container.appendChild(card);
  });
}

/**
 * Submit a new review
 */
function setFormStatus(message, state) {
  const status = document.getElementById('review-form-status');
  if (!status) return;
  status.textContent = message;
  status.dataset.state = state || '';
}

/**
 * Upload an optional review photo to Supabase Storage.
 * Returns { url } on success or { error } on failure.
 */
async function uploadReviewImage(file) {
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
  const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  const { error: uploadError } = await supabaseClient
    .storage
    .from(REVIEW_IMAGE_BUCKET)
    .upload(path, file, { cacheControl: '3600', upsert: false });

  if (uploadError) {
    console.error('Image upload error:', uploadError);
    return { error: uploadError };
  }

  const { data } = supabaseClient.storage.from(REVIEW_IMAGE_BUCKET).getPublicUrl(path);
  return { url: data?.publicUrl || null };
}

function resetImagePreview() {
  const input = document.getElementById('review-image');
  const preview = document.getElementById('review-image-preview');
  if (input) input.value = '';
  if (preview) {
    preview.hidden = true;
    preview.removeAttribute('src');
  }
}

function initImagePreview() {
  const input = document.getElementById('review-image');
  const preview = document.getElementById('review-image-preview');
  if (!input || !preview) return;

  input.addEventListener('change', () => {
    const file = input.files?.[0];
    if (!file) {
      preview.hidden = true;
      preview.removeAttribute('src');
      return;
    }
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      setFormStatus('Format foto harus PNG, JPEG, atau WebP.', 'error');
      resetImagePreview();
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setFormStatus('Ukuran foto maksimal 3MB.', 'error');
      resetImagePreview();
      return;
    }
    preview.src = URL.createObjectURL(file);
    preview.hidden = false;
  });
}

async function submitReview(event) {
  event.preventDefault();
  const form = event.target;
  const name = form['review-name']?.value.trim();
  const ratingInput = form['review-rating'];
  const rating = ratingInput ? parseInt(ratingInput.value, 10) : null;
  const comment = form['review-comment']?.value.trim();
  const imageFile = document.getElementById('review-image')?.files?.[0] || null;

  if (!name || !rating || !comment) {
    setFormStatus('Harap isi semua bidang, termasuk rating bintang.', 'error');
    return;
  }

  const submitButton = form.querySelector('button[type="submit"]');
  if (submitButton) submitButton.disabled = true;
  setFormStatus(imageFile ? 'Mengunggah foto...' : 'Mengirim review...', '');

  const payload = { name, rating, comment };
  let imageFailed = false;
  if (imageFile) {
    const uploadResult = await uploadReviewImage(imageFile);
    if (uploadResult.error) {
      imageFailed = true;
    } else if (uploadResult.url) {
      payload.image_url = uploadResult.url;
    }
  }

  const { error } = await supabaseClient
    .from('reviews')
    .insert(payload);

  if (submitButton) submitButton.disabled = false;

  if (error) {
    console.error('Submit error:', error);
    setFormStatus('Gagal mengirim review. Coba lagi.', 'error');
  } else {
    setFormStatus(
      imageFailed
        ? 'Review terkirim, tapi foto gagal diunggah.'
        : 'Review berhasil dikirim. Terima kasih!',
      imageFailed ? 'error' : 'success'
    );
    form.reset();
    resetStars();
    resetImagePreview();
    loadTestimonials();
  }
}

/**
 * Star rating UI – click or keyboard (Enter/Space) to set rating
 */
function resetStars() {
  const stars = document.querySelectorAll('.review-form .star-rating button');
  stars.forEach(s => {
    s.classList.remove('active');
    s.setAttribute('aria-pressed', 'false');
  });
  const ratingInput = document.getElementById('review-rating');
  if (ratingInput) ratingInput.value = '';
}

function initStarRating() {
  const stars = document.querySelectorAll('.review-form .star-rating button');
  const ratingInput = document.getElementById('review-rating');

  if (!stars.length || !ratingInput) return;

  stars.forEach(star => {
    star.addEventListener('click', () => {
      const val = parseInt(star.dataset.value, 10);
      ratingInput.value = val;
      stars.forEach(s => {
        const active = parseInt(s.dataset.value, 10) <= val;
        s.classList.toggle('active', active);
        s.setAttribute('aria-pressed', String(active));
      });
    });
  });
}

window.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('review-form');
  if (form) form.addEventListener('submit', submitReview);

  initStarRating();
  initImagePreview();
  loadTestimonials();
});
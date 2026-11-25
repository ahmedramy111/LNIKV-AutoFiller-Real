const $ = id => document.getElementById(id);

let jobId = null;
let pollTimer = null;

function setStatus(text) {
  const el = $('status');
  if (el) el.textContent = text;
}

function showMessage(text, type = '') {
  const el = $('msg');
  if (!el) return;

  el.textContent = text;
  el.className = type;
}

function add(text) {
  const el = $('activity');
  if (!el) return;

  const item = document.createElement('div');
  item.textContent = text;
  el.prepend(item);
}

async function poll() {
  if (!jobId) return;

  try {
    const r = await fetch('/api/jobs/' + encodeURIComponent(jobId));

    if (!r.ok) {
      throw new Error('فشل الاتصال بحالة الجلسة: HTTP ' + r.status);
    }

    const j = await r.json();

    const events = Array.isArray(j.events) ? j.events : [];

    const questionCount = events.filter(
      x => x.type === 'question'
    ).length;

    if ($('events')) {
      $('events').textContent = questionCount;
    }

    const chapters = events.filter(
      x => x.type === 'chapter'
    );

    const ch = chapters[chapters.length - 1];

    if ($('last')) {
      $('last').textContent = ch
        ? ('المستوى ' + ch.level)
        : '—';
    }

    for (const e of events.slice(-5)) {

      if (e.type === 'status') {
        setStatus(e.status || 'جاري التشغيل');
      }

      if (e.type === 'question') {
        add(
          `المستوى ${e.level} — السؤال ${e.number} — مطابقة ${Math.round((e.score || 0) * 100)}%`
        );
      }

      if (e.type === 'error') {
        add('❌ ' + (e.message || 'حدث خطأ'));
        setStatus('حدث خطأ');
      }

      if (e.type === 'done') {
        add('✅ اكتملت الجلسة');
        setStatus('اكتملت الجلسة');
      }
    }

  } catch (err) {
    console.error(err);
    showMessage(
      'خطأ في الاتصال بالسيرفر: ' + err.message,
      'error'
    );
    setStatus('خطأ في الاتصال');
  }

  clearTimeout(pollTimer);
  pollTimer = setTimeout(poll, 1300);
}


async function startSession() {

  const phone = $('phone')?.value.trim();
  const code = $('code')?.value.trim();
  const password = $('pass')?.value;

  showMessage('جاري بدء الجلسة...');

  if (!phone || !/^\d{11}$/.test(phone)) {
    showMessage('رقم الهاتف يجب أن يكون 11 رقمًا', 'error');
    return;
  }

  if (!code) {
    showMessage('أدخل كود الحساب', 'error');
    return;
  }

  if (!password) {
    showMessage('أدخل كلمة المرور', 'error');
    return;
  }

  const button = $('start');

  if (button) {
    button.disabled = true;
    button.textContent = 'جاري بدء الجلسة...';
  }

  try {

    const response = await fetch('/api/jobs', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        phone,
        code,
        password
      })
    });

    let data = {};

    try {
      data = await response.json();
    } catch {
      data = {};
    }

    if (!response.ok) {
      throw new Error(
        data.error || ('السيرفر رفض الطلب HTTP ' + response.status)
      );
    }

    if (!data.jobId) {
      throw new Error('السيرفر لم يرجع رقم الجلسة');
    }

    jobId = data.jobId;

    showMessage('تم إدخال الجلسة في التشغيل.');
    setStatus('جاري التشغيل');

    add('🚀 تم بدء جلسة الحل');

    poll();

  } catch (err) {

    console.error('START SESSION ERROR:', err);

    showMessage(
      '❌ ' + err.message,
      'error'
    );

    setStatus('متوقف');

    if (button) {
      button.disabled = false;
      button.textContent = 'بدء الجلسة';
    }
  }
}


const startButton = $('start');

if (startButton) {
  startButton.addEventListener('click', startSession);
} else {
  console.error('زر بدء الجلسة غير موجود');
  showMessage('خطأ: زر بدء الجلسة غير موجود', 'error');
}
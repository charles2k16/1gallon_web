<template>
  <div class="page help">
    <button class="back" type="button" @click="$router.back()">← Back</button>
    <h1 class="sheet-title">Help & support</h1>
    <p class="lede">Questions about an order, a delivery, or your account. Support is available around the clock.</p>

    <h2>Contact</h2>
    <div class="card">
      <a class="row" href="tel:+233242439874">
        <span class="ico call" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="currentColor"><path d="M7.2 3.6c.4-.4 1-.5 1.5-.3l2.2.9c.5.2.8.7.8 1.2l-.2 2.4a1.2 1.2 0 0 1-.7 1l-1.3.6a10.6 10.6 0 0 0 4.9 4.9l.6-1.3c.2-.4.6-.7 1-.7l2.4-.2c.5 0 1 .3 1.2.8l.9 2.2c.2.5.1 1.1-.3 1.5l-1.5 1.5c-.4.4-1 .6-1.6.5C10.6 18.2 5.8 13.4 5.2 6.7c-.1-.6.1-1.2.5-1.6l1.5-1.5Z"/></svg>
        </span>
        <span>
          <strong>Call</strong>
          <small>024 243 9874</small>
        </span>
        <em>›</em>
      </a>
      <a class="row last" :href="whatsapp" target="_blank" rel="noopener">
        <span class="ico wa" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 3.5A8.5 8.5 0 0 0 5.1 16.2L4 20.2l4.1-1.1A8.5 8.5 0 1 0 12 3.5Zm4.4 12.1c-.2.5-1 .9-1.4 1-.4.1-.8.1-1.3-.1-.3-.1-.7-.2-1.2-.4-2.1-.9-3.5-3-3.6-3.1-.1-.2-.9-1.2-.9-2.3s.6-1.6.8-1.8c.2-.2.4-.3.6-.3h.4c.1 0 .3 0 .5.4.2.5.6 1.6.7 1.7.1.1.1.3 0 .4-.1.2-.2.3-.3.5l-.2.2c-.1.1-.2.2-.1.4.1.2.6 1 1.3 1.6.9.8 1.6 1 1.8 1.1.2.1.3.1.4-.1.1-.2.5-.6.6-.8.1-.2.3-.2.5-.1.2.1 1.3.6 1.5.7.2.1.3.2.4.3.1.2.1.7-.1 1.2Z"/></svg>
        </span>
        <span>
          <strong>WhatsApp</strong>
          <small>024 243 9874</small>
        </span>
        <em>›</em>
      </a>
    </div>

    <h2>Social</h2>
    <div class="card">
      <a class="row" href="https://www.instagram.com/onegallonfuel/" target="_blank" rel="noopener">
        <span class="ico ig" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="4" y="4" width="16" height="16" rx="5"/><circle cx="12" cy="12" r="3.4"/><circle cx="17.2" cy="6.8" r="0.8" fill="currentColor" stroke="none"/></svg>
        </span>
        <span>
          <strong>Instagram</strong>
          <small>@onegallonfuel</small>
        </span>
        <em>›</em>
      </a>
      <a class="row last" href="https://www.tiktok.com/@onegallonfuel" target="_blank" rel="noopener">
        <span class="ico tt" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="currentColor"><path d="M14.2 3.5c.4 2.4 1.8 4.1 4.1 4.5v2.4c-1.4 0-2.7-.4-3.9-1.2v6.2c0 3.3-2.6 5.8-5.9 5.8S2.6 18.7 2.6 15.4c0-3.2 2.5-5.7 5.7-5.8v2.6c-1.7.1-3.1 1.5-3.1 3.2 0 1.8 1.4 3.2 3.2 3.2s3.2-1.4 3.2-3.2V3.5h2.6Z"/></svg>
        </span>
        <span>
          <strong>TikTok</strong>
          <small>@onegallonfuel</small>
        </span>
        <em>›</em>
      </a>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'blank' })

const whatsapp = 'https://wa.me/233242439874?text=' + encodeURIComponent('Hi 1Gallon, I need help with an order.')
</script>

<style scoped>
.back {
  color: var(--muted);
  margin-bottom: 12px;
}
.lede {
  margin: 8px 0 22px;
  color: var(--muted);
  font-size: 0.95rem;
  line-height: 1.45;
}
h2 {
  margin: 0 0 10px;
  font-size: 0.95rem;
  font-weight: 600;
}
.card {
  background: var(--white);
  border: 1px solid var(--border);
  border-radius: 16px;
  margin-bottom: 22px;
  overflow: hidden;
}
.row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  border-bottom: 1px solid var(--border);
  color: inherit;
}
.row.last {
  border-bottom: 0;
}
.row strong {
  display: block;
  font-size: 0.98rem;
  font-weight: 600;
}
.row small {
  display: block;
  margin-top: 2px;
  color: var(--muted);
  font-size: 0.82rem;
}
.row em {
  margin-left: auto;
  font-style: normal;
  color: var(--muted);
  font-size: 1.2rem;
}
.row span:nth-child(2) {
  min-width: 0;
}
.ico {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  display: grid;
  place-items: center;
  flex-shrink: 0;
  color: #fff;
}
.ico svg {
  width: 20px;
  height: 20px;
}
.ico.call { background: var(--accent); }
.ico.wa { background: #25d366; }
.ico.ig { background: #c13584; }
.ico.tt { background: var(--ink); }
</style>

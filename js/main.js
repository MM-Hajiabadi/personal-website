// ============================================================================
// Loads content from Supabase.
// ============================================================================

function esc(str) {
  if (str === null || str === undefined) return "";
  return String(str)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

function isConfigured() {
  return window.SUPABASE_URL && !window.SUPABASE_URL.includes("YOUR-PROJECT-REF");
}

async function loadData() {
  const fallback = window.SEED_DATA;
  if (!isConfigured() || !window.supabase) return fallback;

  try {
    const client = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
    const tables = ["profile","traits","education","experience","projects",
                     "publications","certifications","skills","skill_chips","links","socials"];

    const results = await Promise.all(tables.map(t => {
      let q = client.from(t).select("*");
      if (t !== "profile") q = q.order("order_index", { ascending: true });
      return q;
    }));

    const data = {};
    tables.forEach((t, i) => {
      const { data: rows, error } = results[i];
      if (error || !rows) { data[t] = fallback[t]; return; }
      data[t] = t === "profile" ? (rows[0] || fallback.profile) : (rows.length ? rows : fallback[t]);
    });
    data.traits = (data.traits || []).map(t => (typeof t === "string" ? t : t.label));
    return data;
  } catch (err) {
    console.warn("Supabase fetch failed, using fallback content:", err);
    return fallback;
  }
}

function renderProfile(p) {
  document.title = `${p.full_name} — ${p.hero_tag || "Portfolio"}`;
  const metaDesc = document.querySelector('meta[name="description"]');
  if (metaDesc) metaDesc.setAttribute("content", p.meta_description || p.role_tagline || "");

  document.getElementById("brand-name").textContent = p.full_name;
  document.getElementById("hero-tag").textContent = p.hero_tag;
  document.getElementById("hero-name").textContent = p.full_name;
  document.getElementById("hero-sub").innerHTML = esc(p.role_tagline).replace(/\*\*(.+?)\*\*/g, "<b>$1</b>");
  document.getElementById("gh-link").href = p.github_url || "#";

  const facts = document.getElementById("hero-facts");
  facts.innerHTML = `
    <div class="fact"><span class="k">LOCATION</span><div class="v">${esc(p.location)}</div></div>
    <div class="fact"><span class="k">DEGREE</span><div class="v">${esc(p.degree_summary)}</div></div>
    <div class="fact"><span class="k">PAPERS</span><div class="v">${esc(p.papers_count)}</div></div>
    <div class="fact"><span class="k">STATUS</span><div class="v">${esc(p.service_status)}</div></div>`;

  document.getElementById("about-p1").textContent = p.bio_paragraph_1;
  document.getElementById("about-p2").textContent = p.bio_paragraph_2;

  const avatar = document.getElementById("hero-avatar");
  if (avatar && p.avatar_url) avatar.src = p.avatar_url;

  const contactGrid = document.getElementById("contact-grid");
  const items = [];
  if (p.phone) items.push(["PHONE / WHATSAPP", p.phone, p.whatsapp_url || `tel:${p.phone.replace(/\s/g,"")}`]);
  if (p.email) items.push(["EMAIL", p.email, `mailto:${p.email}`]);
  if (p.linkedin_url) items.push(["LINKEDIN", p.linkedin_url.replace(/^https?:\/\//,""), p.linkedin_url]);
  if (p.github_url) items.push(["GITHUB", p.github_url.replace(/^https?:\/\//,""), p.github_url]);
  if (p.telegram_url) items.push(["TELEGRAM", p.telegram_url.replace(/^https?:\/\/t\.me\//,"@"), p.telegram_url]);
  if (p.email_alt) items.push(["EMAIL (ALT)", p.email_alt, `mailto:${p.email_alt}`]);
  contactGrid.innerHTML = items.map(([k,v,href]) => `
    <a class="c-item" href="${esc(href)}" target="${href.startsWith('http')?'_blank':'_self'}" rel="noopener">
      <span class="k">${esc(k)}</span><span class="v">${esc(v)}</span>
    </a>`).join("");

  document.getElementById("footer-name").textContent = p.full_name;
  document.getElementById("footer-location").textContent = p.location;
}

function renderTraits(traits) {
  document.getElementById("traits-box").innerHTML =
    traits.map(t => `<div class="trait">${esc(t)}</div>`).join("");
}

function renderEducation(rows) {
  document.getElementById("edu-list").innerHTML = rows.map(e => `
    <div class="edu-card">
      <span class="edu-years mono">${esc(e.start_year)} — ${esc(e.end_year)}</span>
      <h3>${esc(e.degree)}</h3>
      <div class="uni">${esc(e.field_and_institution)}</div>
      ${e.thesis ? `<div class="thesis"><span class="t-label">THESIS</span>${esc(e.thesis)}
        ${e.advisor ? `<div class="advisor">${esc(e.advisor)}</div>` : ""}</div>` : ""}
    </div>`).join("");
}

function renderExperience(rows) {
  document.getElementById("exp-list").innerHTML = rows.map(x => `
    <div class="exp-card">
      <h3>${esc(x.title)}</h3>
      <div class="place">${esc(x.place)}</div>
      ${x.summary ? `<p style="color:var(--ink-soft);font-size:.9rem;margin-top:10px">${esc(x.summary)}</p>` : ""}
      ${(x.duties && x.duties.length) ? `<div class="exp-duties">${x.duties.map(d=>`<div class="duty">${esc(d)}</div>`).join("")}</div>` : ""}
    </div>`).join("");
}

function renderProjects(rows) {
  document.getElementById("proj-list").innerHTML = rows.map((pr, i) => {
    const idx = String(i + 1).padStart(2, "0");
    const inner = `
      <span class="proj-idx mono">[${idx}]</span>
      <div><div class="proj-name">${esc(pr.title)}</div><div class="proj-desc">${esc(pr.description)}</div></div>
      <div class="proj-tags">${(pr.tags||[]).map(t=>`<span class="tag">${esc(t)}</span>`).join("")}</div>`;
    return pr.link_url ? `<a class="proj" href="${esc(pr.link_url)}" target="_blank" rel="noopener" style="text-decoration:none;color:inherit">${inner}</a>`
                        : `<div class="proj">${inner}</div>`;
  }).join("");
}

function renderPublications(rows) {
  document.getElementById("pub-list").innerHTML = rows.map(pub => `
    <article class="pub">
      <span class="p-type mono">${esc(pub.pub_type)}</span>
      <h3>${esc(pub.title)}</h3>
      <div class="venue">${esc(pub.venue)}</div>
      ${pub.doi_url ? `<a class="doi" href="${esc(pub.doi_url)}" target="_blank" rel="noopener">${esc(pub.doi_url.replace(/^https?:\/\//,""))} ↗</a>` : ""}
    </article>`).join("");
}

function renderCertifications(rows) {
  document.getElementById("cert-grid").innerHTML = rows.map(c => `
    <a class="cert" href="${esc(c.url||'#')}" target="_blank" rel="noopener">
      <div class="cert-issuer">${esc(c.issuer)}</div>
      <span class="cert-badge">${esc(c.badge_label)}</span>
      <div class="cert-title">${esc(c.title)}</div>
      <div class="cert-foot"><span class="verify">View certificate ↗</span></div>
    </a>`).join("");
}

function renderSkills(skills, chips) {
  const cats = [...new Set(skills.map(s => s.category))];
  document.getElementById("skill-bars").innerHTML = cats.map(cat => `
    <h3 style="margin-top:22px" class="cat-h">${esc(cat)}</h3>
    ${skills.filter(s=>s.category===cat).map(s => `
      <div class="bar-row">
        <span>${esc(s.name)}</span>
        <span class="bar"><i style="--w:${Number(s.level_percent)||0}%"></i></span>
        <span class="bar-lvl">${esc(s.level_label)}</span>
      </div>`).join("")}
  `).join("").replace('<h3 style="margin-top:22px" class="cat-h">', '<h3 class="cat-h">'); // first cat no top margin

  const groups = [...new Set(chips.map(c => c.group_name))];
  document.getElementById("skill-chips").innerHTML = groups.map(g => `
    <div class="sub-label">${esc(g).toUpperCase()}</div>
    <div class="chips">${chips.filter(c=>c.group_name===g).map(c=>`<span class="chip">${esc(c.label)}</span>`).join("")}</div>
  `).join("");
}

function renderLinks(links, socials) {
  document.getElementById("socials-row").innerHTML = socials.map(s => `
    <a class="social-btn" href="${esc(s.url)}" target="_blank" rel="noopener" aria-label="${esc(s.platform)}">
      <i class="bi ${esc(s.icon)}" style="color:${esc(s.color||'inherit')}"></i>
    </a>`).join("");

  const active = links.filter(l => l.is_active !== false);
  document.getElementById("links-grid").innerHTML = active.map((l, i) => `
    <a class="link-card" href="${esc(l.url)}" target="_blank" rel="noopener">
      <div class="link-left">
        <span class="link-idx">[${String(i+1).padStart(2,"0")}]</span>
        <div><div class="link-label">${esc(l.label)}</div>${l.sublabel?`<div class="link-sub">${esc(l.sublabel)}</div>`:""}</div>
      </div>
      <i class="bi ${esc(l.icon)} link-icon"></i>
    </a>`).join("");
}

function setupReveal() {
  const io = new IntersectionObserver(es => {
    es.forEach(e => { if (e.isIntersecting) { e.target.classList.add("on"); io.unobserve(e.target); } });
  }, { threshold: 0.12 });
  document.querySelectorAll(".reveal").forEach(el => io.observe(el));
}

function setupYear() {
  const el = document.getElementById("year");
  if (el) el.textContent = new Date().getFullYear();
}

(async function init() {
  const data = await loadData();
  renderProfile(data.profile);
  renderTraits(data.traits);
  renderEducation(data.education);
  renderExperience(data.experience);
  renderProjects(data.projects);
  renderPublications(data.publications);
  renderCertifications(data.certifications);
  renderSkills(data.skills, data.skill_chips);
  renderLinks(data.links, data.socials);
  setupYear();
  setupReveal();
})();

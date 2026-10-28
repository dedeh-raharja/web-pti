/* =========================================================
   Logika website Prodi PTI (tampilan, menu, Mode Editor).
   Isi website ada di js/data.js; gaya tampilan di css/style.css.
   ========================================================= */
(function(){
"use strict";

/* ===== data ===== */
var DEF = {
  v:1,
  profil:{singkatan:"PTI",nama:"Pendidikan Teknologi Informasi",kampus:"Universitas Raharja",tagline:"",sambutanNama:"",sambutanJabatan:"Ketua Program Studi",sambutanTeks:"",sambutanFoto:"",visi:"",misi:"",sejarah:"",akreditasi:"",akreditasiKet:""},
  kontak:{alamat:"",email:"",telepon:"",jam:"",maps:""},
  akreditasi:{peringkat:"",lembaga:"",nomorSK:"",tanggalSK:"",berlaku:"",sertifikat:"",keterangan:""},
  dosen:[], berita:[], dokumen:[],
  kategori:["Kurikulum & RPS","Pedoman","SOP","Formulir","Akreditasi & Mutu","SK & Kalender"]
};
function load(){
  var s = {};
  s = window.PTI_DATA || {};   /* isi website ada di js/data.js */
  var o = {};
  Object.keys(DEF).forEach(function(k){ o[k] = s[k] !== undefined ? s[k] : JSON.parse(JSON.stringify(DEF[k])); });
  o.profil = Object.assign({}, DEF.profil, s.profil || {});
  o.kontak = Object.assign({}, DEF.kontak, s.kontak || {});
  o.akreditasi = Object.assign({}, DEF.akreditasi, s.akreditasi || {});
  if (!o.akreditasi.peringkat && o.profil.akreditasi) o.akreditasi.peringkat = o.profil.akreditasi;
  if (!o.akreditasi.keterangan && o.profil.akreditasiKet) o.akreditasi.keterangan = o.profil.akreditasiKet;
  ["dosen","berita","dokumen","kategori"].forEach(function(k){ if(!Array.isArray(o[k])) o[k] = []; });
  return o;
}
var S = load();

/* sumber halaman, untuk menyimpan versi baru */
var TITLE = "Prodi PTI Raharja";
var FONTS = '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,800&family=Plus+Jakarta+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@500&display=swap">';
var RESET = ':root{color-scheme:light;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}body{margin:0;font:14px/1.4 system-ui,-apple-system,"Segoe UI",sans-serif}img{max-width:100%}[hidden]{display:none!important}';
var STANDALONE = !(window.claude && window.claude.use);
var dirty = false;
var STYLE_SRC = "";
var APP_SRC = "";
function buildDoc(st){
  var json = JSON.stringify(st).replace(/</g,"\\u003c");
  if (STANDALONE) return '<!DOCTYPE html>\n<html lang="id">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n'
    + '<title>' + TITLE + '</title>\n' + FONTS + '\n<style>' + RESET + '</style>\n<style id="page-style">' + STYLE_SRC + '</style>\n</head>\n<body>\n<div id="root"></div>\n'
    + '<script type="application/json" id="state">' + json + '<\/script>\n'
    + '<script id="app">' + APP_SRC + '<\/script>\n</body>\n</html>\n';
  return '<!doctype html><html><head><meta charset=utf8><meta name=viewport content="width=device-width,initial-scale=1,viewport-fit=cover"><style>' + RESET + '</style></head><body>'
    + '<title>' + TITLE + '</title>\n<meta name="claude:viewport-fit-sides" content="cover">\n' + FONTS + '\n'
    + '<style id="page-style">' + STYLE_SRC + '</style>\n<div id="root"></div>\n'
    + '<script type="application/json" id="state">' + json + '<\/script>\n'
    + '<script id="app">' + APP_SRC + '<\/script>\n</body></html>';
}

/* ===== keadaan tampilan ===== */
var VIEWS = ["beranda","profil","akreditasi","dosen","berita","dokumen","kontak"];
var NAMES = {beranda:"Beranda",profil:"Profil",akreditasi:"Akreditasi",dosen:"Dosen",berita:"Berita",dokumen:"Dokumen",kontak:"Kontak"};
var view = "beranda", docCat = "Semua", docQ = "", newsCat = "Semua";
var canEdit = false, editMode = false, art = null, assets = null, busy = false;
var root = document.getElementById("root");

var store = {
  get:function(k){ try { return sessionStorage.getItem(k); } catch(e){ return null; } },
  set:function(k,v){ try { if (v == null) sessionStorage.removeItem(k); else sessionStorage.setItem(k, v); } catch(e){} }
};

/* ===== utilitas ===== */
var BULAN = ["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];
function esc(s){ return String(s == null ? "" : s).replace(/[&<>"']/g, function(m){ return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]; }); }
function paras(t){ return String(t||"").split(/\n+/).map(function(x){return x.trim();}).filter(Boolean).map(function(p){ return "<p>" + esc(p) + "</p>"; }).join(""); }
function lines(t){ return String(t||"").split("\n").map(function(x){ return x.replace(/^\s*(\d+[.)]|[-•*])\s*/,"").trim(); }).filter(Boolean); }
function isUrl(l){ return /^https?:\/\//i.test(String(l||"").trim()); }
function uid(){ return Date.now().toString(36) + Math.random().toString(36).slice(2,6); }
function today(){ var d = new Date(); return d.getFullYear() + "-" + String(d.getMonth()+1).padStart(2,"0") + "-" + String(d.getDate()).padStart(2,"0"); }
function parts(iso){ var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso||""); return m ? {y:+m[1], m:+m[2], d:+m[3]} : null; }
function fmtDate(iso){ var p = parts(iso); return p ? p.d + " " + BULAN[p.m-1] + " " + p.y : esc(iso||""); }
function initials(n){ var w = String(n||"").replace(/,.*$/,"").replace(/\b(Dr|Prof|Ir|Drs|Dra|H|Hj)\.?\s+/gi,"").trim().split(/\s+/).filter(Boolean); return ((w[0]||"?")[0] + (w.length>1 ? w[w.length-1][0] : "")).toUpperCase(); }
function blob(id){ return !id ? "" : /^(data:|aset\/|https?:)/.test(id) ? id : "aset/" + id; }
function avatar(name, foto){ return '<div class="avatar" aria-hidden="true">' + esc(initials(name)) + (foto ? '<img src="' + esc(blob(foto)) + '" alt="" onerror="this.remove()">' : "") + "</div>"; }
function P(){ return S.profil; }
function fullName(){ return "Program Studi " + P().nama; }

/* ===== bagian bersama ===== */
function edButtons(type, id){
  if (!editMode) return "";
  return '<div class="ed"><button type="button" data-act="edit" data-type="' + type + '" data-id="' + esc(id) + '">Ubah</button>'
       + '<button type="button" class="del" data-act="del" data-type="' + type + '" data-id="' + esc(id) + '">Hapus</button></div>';
}
function addBtn(type, label){ return editMode ? '<button type="button" class="btn add" data-act="add" data-type="' + type + '">+ ' + esc(label) + "</button>" : ""; }
function emptyBox(text, editText){ return '<div class="empty">' + esc(editMode && editText ? editText : text) + "</div>"; }

function header(){
  var nav = VIEWS.map(function(v){ return '<a href="#' + v + '" data-go="' + v + '"' + (v===view ? ' aria-current="page"' : "") + ">" + NAMES[v] + "</a>"; }).join("");
  var tgl = canEdit ? '<button type="button" class="edit-toggle" data-act="' + (editMode ? "exit-edit" : "enter-edit") + '">' + (editMode ? "Selesai mengedit" : "Mode Editor") + "</button>" : "";
  return '<header class="top"><div class="wrap">'
    + '<a class="brand" href="#beranda" data-go="beranda"><div class="logo">' + esc((P().singkatan||"PTI").slice(0,4)) + '</div><div><small>' + esc(P().kampus) + "</small><strong>" + esc(P().nama) + "</strong></div></a>"
    + '<nav class="nav" aria-label="Menu utama">' + nav + "</nav>" + tgl + "</div></header>";
}
function pageHead(title, sub, kicker){
  return '<section class="page-head grid-paper"><div class="wrap"><span class="kicker">' + esc(kicker || P().kampus) + "</span><h1>" + esc(title) + "</h1>" + (sub ? "<p>" + esc(sub) + "</p>" : "") + "</div></section>";
}
function footer(){
  var k = S.kontak, p = P();
  var kontak = [k.alamat, k.email, k.telepon].filter(Boolean).map(function(x){ return "<p>" + esc(x).replace(/\n/g,"<br>") + "</p>"; }).join("");
  return '<footer class="site"><div class="wrap">'
    + '<div><div class="fbrand"><div class="logo">' + esc((p.singkatan||"PTI").slice(0,4)) + "</div><strong>" + esc(fullName()) + "</strong></div><p>" + esc(p.kampus) + "</p></div>"
    + '<div><h4>Menu</h4><div class="fnav">' + VIEWS.map(function(v){ return '<a href="#' + v + '" data-go="' + v + '">' + NAMES[v] + "</a>"; }).join("") + "</div></div>"
    + "<div><h4>Kontak</h4>" + (kontak || "<p>Informasi kontak segera tersedia.</p>") + "</div>"
    + '</div><div class="wrap fbottom">\u00a9 ' + new Date().getFullYear() + " " + esc(fullName()) + ", " + esc(p.kampus) + "</div></footer>";
}

/* ===== beranda ===== */
var ICON = {
  profil:'<path d="M12 3 3 8l9 5 9-5-9-5z"/><path d="M7 10.5V15c0 1.7 2.2 3 5 3s5-1.3 5-3v-4.5"/>',
  dosen:'<circle cx="9" cy="8" r="3"/><path d="M3 19c0-3.3 2.7-5 6-5s6 1.7 6 5"/><circle cx="17" cy="9" r="2.4"/><path d="M15.5 14.2c2.9.2 5.5 1.7 5.5 4.8"/>',
  berita:'<path d="M4 6h12v13H6a2 2 0 0 1-2-2z"/><path d="M16 9h4v8a2 2 0 0 1-2 2"/><path d="M7 10h6M7 14h6"/>',
  dokumen:'<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>'
};
function icon(k){ return '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + ICON[k] + "</svg>"; }
function secHead(kicker, title, right){
  return '<div class="sec-head"><div>' + (kicker ? '<span class="kicker">' + esc(kicker) + "</span>" : "") + "<h2>" + title + "</h2></div>" + (right ? '<div class="btns">' + right + "</div>" : "") + "</div>";
}
function personCard(d){
  var dl = "";
  if (d.keahlian) dl += "<div><dt>Bidang keahlian</dt><dd>" + esc(d.keahlian) + "</dd></div>";
  if (d.nidn) dl += '<div><dt>NIDN</dt><dd class="mono">' + esc(d.nidn) + "</dd></div>";
  if (d.email) dl += "<div><dt>Email</dt><dd>" + esc(d.email) + "</dd></div>";
  return '<article class="person"><div class="portrait" aria-hidden="true">' + esc(initials(d.nama))
    + (d.foto ? '<img src="' + esc(blob(d.foto)) + '" alt="" onerror="this.remove()">' : "") + "</div>"
    + '<div class="pbody"><div><h3>' + esc(d.nama) + '</h3><div class="role">' + esc(d.jabatan || "Dosen") + "</div></div>"
    + (dl ? "<dl>" + dl + "</dl>" : "") + edButtons("dosen", d.id) + "</div></article>";
}
function vBeranda(){
  var p = P();
  var lead = p.tagline || ("Informasi akademik, profil, dosen, berita, dan dokumen resmi " + fullName() + " " + p.kampus + ".");
  var html = '<section class="hero grid-paper"><div class="wrap"><div>'
    + '<div class="eyebrow">' + esc(p.kampus) + "</div>"
    + '<h1><span class="pre">Program Studi</span>' + esc(p.nama) + "</h1>"
    + '<p class="lead">' + esc(lead) + "</p>"
    + '<div class="btns"><a class="btn accent" href="#dokumen" data-go="dokumen">Lihat dokumen</a><a class="btn on-dark" href="#profil" data-go="profil">Profil prodi</a><a class="btn on-dark" href="#akreditasi" data-go="akreditasi">Akreditasi</a>'
    + (editMode ? '<button type="button" class="btn on-dark" data-act="form" data-type="profil">Ubah profil &amp; beranda</button>' : "") + "</div></div>"
    + '<div class="glance"><span class="gl-title">Sekilas prodi</span>'
    + (S.akreditasi.peringkat ? '<a class="gl-link" href="#akreditasi" data-go="akreditasi"><span>Akreditasi \u2192</span><b>' + esc(S.akreditasi.peringkat) + "</b></a>" : "")
    + "<div><span>Dosen</span><b>" + S.dosen.length + "</b></div>"
    + "<div><span>Dokumen</span><b>" + S.dokumen.length + "</b></div>"
    + "<div><span>Berita &amp; pengumuman</span><b>" + S.berita.length + "</b></div>"
    + "</div></div></section>";

  var tiles = [
    ["profil","Profil & Visi Misi","Visi, misi, dan sejarah program studi.", "Lihat profil"],
    ["dosen","Dosen & Staf","Tenaga pengajar dan bidang keahliannya.", S.dosen.length + " dosen"],
    ["berita","Berita & Pengumuman","Kegiatan, agenda, dan info akademik terbaru.", S.berita.length + " kabar"],
    ["dokumen","Dokumen Prodi","Kurikulum, pedoman, SOP, dan formulir.", S.dokumen.length + " dokumen"]
  ];
  html += '<div class="wrap"><nav class="quick" aria-label="Menu cepat">' + tiles.map(function(t){
    return '<a class="tile" href="#' + t[0] + '" data-go="' + t[0] + '"><div class="ic">' + icon(t[0]) + "</div><strong>" + t[1] + "</strong><span>" + t[2] + "</span><em>" + esc(t[3]) + " →</em></a>";
  }).join("") + "</nav></div>";

  html += '<div class="wrap sections">';

  if (p.sambutanTeks || editMode){
    html += "<section>" + secHead("Sambutan", esc(p.sambutanJabatan || "Ketua Program Studi"),
      editMode ? '<button type="button" class="btn small ghost" data-act="form" data-type="profil">Ubah sambutan</button>' : "");
    html += p.sambutanTeks ? sambutanHtml(p) : emptyBox("", "Sambutan belum diisi. Klik \u201cUbah sambutan\u201d untuk menulisnya.");
    html += "</section>";
  }

  if (S.dosen.length || editMode){
    html += "<section>" + secHead("Pengajar", "Dosen Program Studi",
      addBtn("dosen","Tambah dosen") + (S.dosen.length > 4 ? '<a class="btn small ghost" href="#dosen" data-go="dosen">Semua dosen</a>' : ""));
    html += S.dosen.length ? '<div class="people">' + S.dosen.slice(0,4).map(personCard).join("") + "</div>"
      : emptyBox("", "Belum ada dosen. Klik “+ Tambah dosen”.");
    html += "</section>";
  }

  var news = sortedNews().slice(0,3);
  html += "<section>" + secHead("Kabar terbaru", "Berita &amp; Pengumuman",
      addBtn("berita","Tambah berita") + (S.berita.length > 3 ? '<a class="btn small ghost" href="#berita" data-go="berita">Semua berita</a>' : ""))
    + (news.length ? '<div class="news">' + news.map(function(b){ return postHtml(b, true); }).join("") + "</div>" : emptyBox("Belum ada berita atau pengumuman.", "Belum ada berita. Klik “+ Tambah berita” untuk menulis yang pertama."))
    + "</section>";

  var docs = S.dokumen.slice(-5).reverse();
  html += "<section>" + secHead("Arsip", "Dokumen Terbaru",
      addBtn("dokumen","Tambah dokumen") + (S.dokumen.length ? '<a class="btn small ghost" href="#dokumen" data-go="dokumen">Semua dokumen</a>' : ""))
    + (docs.length ? '<div class="list">' + docs.map(docRow).join("") + "</div>" : emptyBox("Belum ada dokumen.", "Belum ada dokumen. Klik “+ Tambah dokumen” lalu isi judul dan link-nya."))
    + "</section>";

  return html + "</div>";
}

/* ===== sambutan ===== */
function sambutanHtml(p){
  var raw = String(p.sambutanTeks || "").replace(/\r/g, "");
  var blocks = raw.split(/\n\s*\n/).map(function(x){ return x.trim(); }).filter(Boolean);
  if (blocks.length === 1 && blocks[0].indexOf("\n") >= 0) blocks = blocks[0].split("\n").map(function(x){ return x.trim(); }).filter(Boolean);
  var body = "", sign = [], closed = false, first = true;
  blocks.forEach(function(bl){
    if (closed){ sign = sign.concat(bl.split("\n").map(function(x){ return x.trim(); }).filter(Boolean)); return; }
    if (/^(assalamu|wassalamu|salam sejahtera|salam\b|om swastiastu|shalom|namo buddhaya)/i.test(bl)){
      body += '<p class="salam">' + esc(bl) + "</p>";
      if (/^wassalamu/i.test(bl)) closed = true;
      return;
    }
    body += "<p" + (first ? ' class="lead-p"' : "") + ">" + esc(bl).replace(/\n/g, "<br>") + "</p>";
    first = false;
  });
  var name = p.sambutanNama, jab = p.sambutanJabatan || "Ketua Program Studi";
  var signLines = sign.length ? sign : (name ? [jab] : []);
  var signHtml = (name || signLines.length) ? '<div class="sign"><span class="sign-line"></span>' + (name ? "<strong>" + esc(name) + "</strong>" : "")
    + signLines.map(function(l){ return "<span>" + esc(l) + "</span>"; }).join("") + "</div>" : "";
  var long = blocks.length > 4;
  return '<div class="welcome2">'
    + '<aside class="wl-card">' + avatar(name || jab, p.sambutanFoto) + (name ? "<strong>" + esc(name) + "</strong>" : "") + "<span>" + esc(jab) + "</span></aside>"
    + '<div class="wl-col"><div class="wl-text' + (long ? " clamped" : "") + '" lang="id"><span class="qmark" aria-hidden="true">\u201c</span>' + body + signHtml + "</div>"
    + (long ? '<button type="button" class="linkbtn wl-more" data-act="welcome-more">Baca sambutan lengkap</button>' : "") + "</div></div>";
}

/* ===== profil ===== */
function vProfil(){
  var p = P(), misi = lines(p.misi);
  var html = pageHead("Profil Program Studi", fullName() + ", " + p.kampus, "Tentang kami");
  html += '<div class="wrap sections">';
  if (editMode) html += '<div><button type="button" class="btn accent" data-act="form" data-type="profil">Ubah profil</button></div>';
  var any = p.visi || misi.length || p.sejarah || S.akreditasi.peringkat;
  if (!any) return html + emptyBox("Profil program studi belum diisi.", "Profil belum diisi. Klik “Ubah profil” untuk mengisi visi, misi, sejarah, dan akreditasi.") + "</div>";
  if (p.visi) html += '<section class="visi-band"><span class="kicker">Visi</span><p class="visi">' + esc(p.visi) + "</p></section>";
  if (misi.length) html += "<section>" + secHead("Misi", "Langkah mewujudkan visi") + '<ol class="misi-grid">' + misi.map(function(m){ return "<li>" + esc(m) + "</li>"; }).join("") + "</ol></section>";
  if (p.sejarah) html += "<section>" + secHead("Sejarah", "Sejarah Singkat") + '<div class="prose">' + paras(p.sejarah) + "</div></section>";
  var A = S.akreditasi;
  if (A.peringkat) html += "<section>" + secHead("Mutu", "Akreditasi", '<a class="btn small ghost" href="#akreditasi" data-go="akreditasi">Detail akreditasi</a>')
    + '<div class="panel"><div class="akr"><b>' + esc(A.peringkat) + "</b>" + akrStatus(A) + "</div>"
    + (A.lembaga ? '<p class="muted" style="margin-top:6px">' + esc(A.lembaga) + "</p>" : "") + "</div></section>";
  return html + "</div>";
}

/* ===== akreditasi ===== */
function akrStatus(a){
  if (!parts(a.berlaku)) return "";
  var ok = a.berlaku >= today();
  return '<span class="status ' + (ok ? "ok" : "warn") + '">' + (ok ? "Berlaku hingga " : "Masa berlaku berakhir ") + fmtDate(a.berlaku) + "</span>";
}
function isAkrDoc(d){ return /akreditasi|mutu/i.test(d.kategori || ""); }
function vAkreditasi(){
  var a = S.akreditasi;
  var html = pageHead("Akreditasi Program Studi", fullName() + ", " + P().kampus + ".", "Mutu");
  html += '<div class="wrap sections">';
  if (editMode) html += '<div><button type="button" class="btn accent" data-act="form" data-type="akreditasi">Ubah data akreditasi</button></div>';
  if (!a.peringkat && !a.nomorSK && !a.lembaga){
    html += emptyBox("Data akreditasi belum diisi.", "Data akreditasi belum diisi. Klik \u201cUbah data akreditasi\u201d untuk mengisi peringkat, nomor SK, dan masa berlaku.");
  } else {
    var facts = [["Lembaga akreditasi", a.lembaga], ["Nomor SK", a.nomorSK], ["Tanggal SK", a.tanggalSK ? fmtDate(a.tanggalSK) : ""], ["Berlaku sampai", a.berlaku ? fmtDate(a.berlaku) : ""]]
      .filter(function(x){ return x[1]; });
    html += '<section class="akr-card"><div class="akr-main"><span class="kicker">Peringkat akreditasi</span><b class="akr-grade">' + esc(a.peringkat || "\u2013") + "</b>" + akrStatus(a)
      + (isUrl(a.sertifikat) ? '<a class="btn accent" href="' + esc(a.sertifikat) + '" target="_blank" rel="noopener">Lihat sertifikat</a>' : "") + "</div>"
      + (facts.length ? '<dl class="akr-facts">' + facts.map(function(x){ return "<div><dt>" + x[0] + "</dt><dd>" + esc(x[1]) + "</dd></div>"; }).join("") + "</dl>" : "")
      + "</section>";
    if (a.keterangan) html += '<section class="prose">' + paras(a.keterangan) + "</section>";
  }
  var docs = S.dokumen.filter(isAkrDoc);
  html += "<section>" + secHead("Dokumen pendukung", "Dokumen Akreditasi &amp; Mutu",
      editMode ? '<button type="button" class="btn add" data-act="add" data-type="dokumen" data-kat="Akreditasi &amp; Mutu">+ Tambah dokumen</button>' : "")
    + (docs.length ? '<div class="list">' + docs.map(docRow).join("") + "</div>"
       : emptyBox("Belum ada dokumen akreditasi.", "Belum ada dokumen. Klik \u201c+ Tambah dokumen\u201d; kategorinya otomatis Akreditasi & Mutu."))
    + "</section>";
  return html + "</div>";
}

/* ===== dosen ===== */
function vDosen(){
  var html = pageHead("Dosen & Staf", "Tenaga pengajar " + fullName() + ".", "Pengajar");
  html += '<div class="wrap sections"><section>';
  if (editMode) html += '<div class="sec-head"><span class="muted">' + S.dosen.length + " orang</span>" + addBtn("dosen","Tambah dosen") + "</div>";
  if (!S.dosen.length) html += emptyBox("Data dosen belum tersedia.", "Belum ada dosen. Klik “+ Tambah dosen”.");
  else html += '<div class="people">' + S.dosen.map(personCard).join("") + "</div>";
  return html + "</section></div>";
}

/* ===== berita ===== */
function sortedNews(){ return S.berita.slice().sort(function(a,b){ return String(b.tanggal||"").localeCompare(String(a.tanggal||"")) || String(b.id).localeCompare(String(a.id)); }); }
function postHtml(b, short){
  var p = parts(b.tanggal);
  var cal = p ? '<div class="cal"><b>' + p.d + "</b><span>" + BULAN[p.m-1].slice(0,3) + "</span><i>" + p.y + "</i></div>" : '<div class="cal"><b>–</b><span>&nbsp;</span></div>';
  var tagCls = b.kategori === "Pengumuman" ? "tag peng" : "tag";
  var long = String(b.isi||"").length > 260;
  var img = b.gambar ? '<figure class="post-img"><img src="' + esc(blob(b.gambar)) + '" alt="' + esc(b.judul) + '" loading="lazy" onerror="this.closest(\'.post\').classList.remove(\'has-img\');this.parentNode.remove()"></figure>' : "";
  return '<article class="post' + (img ? " has-img" : "") + '">' + cal + '<div class="pmain">' + img + '<div class="ptext">'
    + '<div class="meta"><span class="' + tagCls + '">' + esc(b.kategori || "Berita") + "</span><span>" + fmtDate(b.tanggal) + "</span></div>"
    + "<h3>" + esc(b.judul) + "</h3>"
    + '<div class="body' + (long ? " clamp" : "") + '">' + paras(b.isi) + "</div>"
    + '<div class="foot">'
    + (long ? '<button type="button" class="linkbtn" data-act="more">Baca selengkapnya</button>' : "")
    + attachHtml(b)
    + edButtons("berita", b.id) + "</div></div></div></article>";
}
function linkHost(u){ try { return new URL(u).hostname.replace(/^www\./, ""); } catch(e){ return ""; } }
function linkKind(u){
  var h = linkHost(u);
  if (/drive\.google|docs\.google/.test(h)) return "Google Drive";
  if (/instagram\.com/.test(h)) return "Instagram";
  if (/youtube\.com|youtu\.be/.test(h)) return "YouTube";
  if (/\.pdf(\?|$)/i.test(u)) return "PDF";
  return h;
}
function attachHtml(b){
  var hasFile = !!b.file, hasLink = isUrl(b.link);
  if (!hasFile && !hasLink) return "";
  var kind = [hasFile ? "File " + fileKind(b.fileName) : "", hasLink ? linkKind(b.link) : ""].filter(Boolean).join(" \u00b7 ");
  var title = b.lampiranJudul || (hasFile ? (b.fileName || "File lampiran") : (linkKind(b.link) === "Instagram" ? "Postingan Instagram" : "Dokumen lampiran"));
  return '<div class="attach"><div class="attach-ic" aria-hidden="true"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h4"/></svg></div>'
    + '<div class="attach-info"><span class="label">Lampiran</span><strong>' + esc(title) + "</strong>" + (kind ? "<small>" + esc(kind) + "</small>" : "") + "</div>"
    + '<div class="actions">' + fileLinkButtons(b.file, b.link) + "</div></div>";
}
function vBerita(){
  var html = pageHead("Berita & Pengumuman", "Kabar kegiatan, agenda, dan pengumuman akademik.");
  var cats = ["Semua","Berita","Pengumuman","Agenda"];
  var all = sortedNews();
  var rows = all.filter(function(b){ return newsCat === "Semua" || (b.kategori||"Berita") === newsCat; });
  html += '<div class="wrap sections"><section>';
  html += '<div class="sec-head"><div class="chips" style="margin:0">' + cats.map(function(c){
    var n = c === "Semua" ? all.length : all.filter(function(b){ return (b.kategori||"Berita") === c; }).length;
    return '<button type="button" data-act="news-cat" data-cat="' + c + '" aria-pressed="' + (c===newsCat) + '">' + c + " <span>" + n + "</span></button>";
  }).join("") + "</div>" + addBtn("berita","Tambah berita") + "</div>";
  html += rows.length ? '<div class="news">' + rows.map(function(b){ return postHtml(b); }).join("") + "</div>"
    : emptyBox(all.length ? "Tidak ada " + newsCat.toLowerCase() + " saat ini." : "Belum ada berita atau pengumuman.", all.length ? "" : "Belum ada berita. Klik “+ Tambah berita”.");
  return html + "</section></div>";
}

/* ===== dokumen ===== */
function docCats(){ var c = []; S.dokumen.forEach(function(d){ var k = d.kategori || "Lainnya"; if (c.indexOf(k) < 0) c.push(k); }); return c; }
function docRow(d){
  var meta = ['<span class="tag">' + esc(d.kategori || "Lainnya") + "</span>"];
  if (d.format) meta.push("<span>" + esc(d.format) + "</span>");
  if (d.revisi) meta.push("<span>" + esc(d.revisi) + "</span>");
  if (d.tanggal) meta.push("<span>Berlaku " + esc(d.tanggal) + "</span>");
  if (d.file) meta.push('<span class="has-file">File ' + esc(fileKind(d.fileName)) + "</span>");
  var act = fileLinkButtons(d.file, d.link) || '<span class="nolink">File / link belum ada</span>';
  return '<div class="row' + (d.kode ? "" : " nocode") + '">' + (d.kode ? '<div class="code">' + esc(d.kode) + "</div>" : "") + '<div class="info"><strong>' + esc(d.judul) + '</strong><div class="meta">' + meta.join("") + "</div></div>"
    + '<div class="actions">' + act + edButtons("dokumen", d.id) + "</div></div>";
}
function fileKind(n){ var m = /\.([a-z0-9]{2,5})$/i.exec(n || ""); return m ? m[1].toUpperCase() : "terlampir"; }
function fileLinkButtons(file, link){
  var h = "";
  if (file) h += '<a class="open" href="' + esc(blob(file)) + '" target="_blank" rel="noopener">Buka file</a>';
  if (isUrl(link)) h += '<a class="open' + (file ? " alt" : "") + '" href="' + esc(link) + '" target="_blank" rel="noopener">Buka link</a><button type="button" class="copy" data-act="copy" data-link="' + esc(link) + '">Salin link</button>';
  return h;
}
function docListHtml(){
  var term = docQ.trim().toLowerCase();
  var rows = S.dokumen.filter(function(d){ return (docCat === "Semua" || (d.kategori||"Lainnya") === docCat) && (!term || (d.judul + " " + (d.kode||"") + " " + (d.kategori||"")).toLowerCase().indexOf(term) >= 0); });
  if (!S.dokumen.length) return emptyBox("Belum ada dokumen.", "Belum ada dokumen. Klik “+ Tambah dokumen”, isi judul, lalu tempel link-nya.");
  if (!rows.length) return emptyBox("Tidak ada dokumen yang cocok. Coba kata kunci lain atau pilih “Semua”.");
  return '<div class="list">' + rows.map(docRow).join("") + "</div>";
}
function docCount(){
  var term = docQ.trim().toLowerCase();
  return S.dokumen.filter(function(d){ return (docCat === "Semua" || (d.kategori||"Lainnya") === docCat) && (!term || (d.judul + " " + (d.kode||"") + " " + (d.kategori||"")).toLowerCase().indexOf(term) >= 0); }).length;
}
function vDokumen(){
  var cats = docCats();
  if (docCat !== "Semua" && cats.indexOf(docCat) < 0) docCat = "Semua";
  var html = pageHead("Dokumen Program Studi", "Kurikulum, pedoman, SOP, formulir, dan dokumen mutu.");
  html += '<div class="wrap sections"><section>';
  html += '<div class="sec-head"><label class="search" for="docq" style="margin:0"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>'
    + '<input id="docq" type="search" placeholder="Cari dokumen, misalnya: skripsi, RPS, SOP" autocomplete="off" value="' + esc(docQ) + '"><span class="count" id="doccount">' + docCount() + " dokumen</span></label>"
    + addBtn("dokumen","Tambah dokumen") + "</div>";
  if (cats.length) html += '<div class="chips">' + ["Semua"].concat(cats).map(function(c){
    var n = c === "Semua" ? S.dokumen.length : S.dokumen.filter(function(d){ return (d.kategori||"Lainnya") === c; }).length;
    return '<button type="button" data-act="doc-cat" data-cat="' + esc(c) + '" aria-pressed="' + (c===docCat) + '">' + esc(c) + " <span>" + n + "</span></button>";
  }).join("") + "</div>";
  html += '<div id="doclist">' + docListHtml() + "</div>";
  return html + "</section></div>";
}

/* ===== kontak ===== */
function vKontak(){
  var k = S.kontak;
  var html = pageHead("Kontak", "Sekretariat " + fullName() + ", " + P().kampus + ".");
  html += '<div class="wrap sections"><section>';
  if (editMode) html += '<div class="sec-head"><span></span><button type="button" class="btn accent" data-act="form" data-type="kontak">Ubah kontak</button></div>';
  var items = [["Alamat", k.alamat], ["Email", k.email], ["Telepon / WhatsApp", k.telepon], ["Jam layanan", k.jam]].filter(function(x){ return x[1]; });
  if (!items.length && !isUrl(k.maps)) html += emptyBox("Informasi kontak belum diisi.", "Kontak belum diisi. Klik “Ubah kontak”.");
  else {
    html += '<div class="cols contact">' + items.map(function(x){
      var copy = (x[0] === "Email" || x[0].indexOf("Telepon") === 0) ? '<button type="button" class="copy" style="margin-top:10px" data-act="copy" data-link="' + esc(x[1]) + '">Salin</button>' : "";
      return '<div class="panel"><dl><dt class="label">' + x[0] + "</dt><dd>" + esc(x[1]).replace(/\n/g,"<br>") + "</dd></dl>" + copy + "</div>";
    }).join("") + "</div>";
    if (isUrl(k.maps)) html += '<p style="margin-top:16px"><a class="btn ghost" href="' + esc(k.maps) + '" target="_blank" rel="noopener">Lihat lokasi di peta</a></p>';
  }
  return html + "</section></div>";
}

/* ===== render ===== */
function editorBar(){
  if (!editMode) return "";
  if (STANDALONE) return '<div class="edbar"><div class="wrap"><p><strong>Mode Editor (file mandiri).</strong> ' + (dirty ? "Ada perubahan yang belum diunduh. Klik \u201cUnduh data.js terbaru\u201d, lalu ganti file js/data.js yang lama dengan file hasil unduhan." : "Perubahan disimpan ke file baru: setelah mengedit, klik \u201cUnduh data.js terbaru\u201d.") + "</p>"
    + '<div class="btns"><button type="button" class="btn small accent" data-act="download">Unduh data.js terbaru</button><button type="button" class="btn small" data-act="exit-edit">Selesai mengedit</button></div></div></div>';
  return '<div class="edbar"><div class="wrap"><p><strong>Mode Editor aktif.</strong> Setiap perubahan langsung tersimpan dan terlihat oleh semua pengunjung. Untuk menambah editor, undang orangnya sebagai Editor lewat menu Share.</p>'
    + '<button type="button" class="btn small" data-act="exit-edit">Selesai mengedit</button></div></div>';
}
function render(){
  document.body.classList.toggle("editing", editMode);
  var body = {beranda:vBeranda, profil:vProfil, akreditasi:vAkreditasi, dosen:vDosen, berita:vBerita, dokumen:vDokumen, kontak:vKontak}[view]();
  root.innerHTML = header() + "<main>" + body + "</main>" + footer() + editorBar()
    + '<div class="modal" id="modal" hidden></div><div id="toast-slot"></div>';
  var q = document.getElementById("docq");
  if (q) q.addEventListener("input", function(){ docQ = q.value; document.getElementById("doclist").innerHTML = docListHtml(); document.getElementById("doccount").textContent = docCount() + " dokumen"; });
}
function go(v){
  if (VIEWS.indexOf(v) < 0) v = "beranda";
  view = v; store.set("pti_view", v);
  render();
  try { window.scrollTo(0,0); } catch(e){}
}

var toastTimer;
function toast(msg, err){
  var slot = document.getElementById("toast-slot");
  if (!slot) return;
  slot.innerHTML = '<div class="toast' + (err ? " err" : "") + '" role="status">' + esc(msg) + "</div>";
  clearTimeout(toastTimer);
  toastTimer = setTimeout(function(){ slot.innerHTML = ""; }, err ? 6000 : 3000);
}

/* ===== formulir ===== */
var FORMS = {
  dosen:{title:"dosen", fields:[
    {k:"nama", label:"Nama lengkap dan gelar", req:1, full:1},
    {k:"jabatan", label:"Jabatan", hint:"Contoh: Ketua Program Studi, Dosen Tetap"},
    {k:"nidn", label:"NIDN"},
    {k:"keahlian", label:"Bidang keahlian", full:1},
    {k:"email", label:"Email", type:"email", full:1},
    {k:"foto", label:"Foto", type:"photo", full:1, nameKey:"nama"}
  ]},
  berita:{title:"berita", fields:[
    {k:"judul", label:"Judul", req:1, full:1},
    {k:"kategori", label:"Jenis", type:"select", opts:["Berita","Pengumuman","Agenda"]},
    {k:"tanggal", label:"Tanggal", type:"date", req:1},
    {k:"isi", label:"Isi", type:"textarea", rows:7, req:1, full:1, hint:"Tekan Enter untuk paragraf baru."},
    {k:"gambar", label:"Gambar berita", type:"photo", wide:1, full:1, hint:"Unggah gambar JPG atau PNG (maks. 5 MB). Gambar tampil langsung di berita."},
    {k:"lampiranJudul", label:"Judul dokumen lampiran (opsional)", full:1, hint:"Contoh: Surat Edaran Jadwal Sidang, Brosur PMB 2026"},
    {k:"link", label:"Link dokumen lampiran (opsional)", type:"url", full:1, hint:"Link Google Drive (akses: siapa saja yang memiliki link) atau postingan Instagram."},
    {k:"file", label:"File lampiran (opsional)", type:"file", full:1, hint:"PDF atau gambar. File Word/Excel: simpan sebagai PDF dulu, atau pakai link Google Drive."}
  ]},
  dokumen:{title:"dokumen", fields:[
    {k:"judul", label:"Judul dokumen", req:1, full:1},
    {k:"link", label:"Link dokumen", type:"url", full:1, hint:"Google Drive: klik kanan file > Bagikan > “Siapa saja yang memiliki link” > Salin link."},
    {k:"file", label:"File dokumen", type:"file", full:1, hint:"Unggah PDF atau gambar. Boleh diisi bersama link, salah satu saja juga boleh. File Word/Excel: simpan sebagai PDF dulu."},
    {k:"kategori", label:"Kategori", list:1, hint:"Pilih atau ketik kategori baru."},
    {k:"kode", label:"Kode / nomor dokumen"},
    {k:"revisi", label:"Revisi"},
    {k:"tanggal", label:"Tanggal berlaku", hint:"Contoh: Oktober 2026"},
    {k:"format", label:"Format", type:"select", opts:["","PDF","DOCX","XLSX","PPTX","Folder","Link"]}
  ]},
  profil:{title:"profil & beranda", fields:[
    {group:"Identitas"},
    {k:"nama", label:"Nama program studi", req:1},
    {k:"singkatan", label:"Singkatan (logo)", hint:"Maksimal 4 huruf"},
    {k:"kampus", label:"Nama kampus", req:1, full:1},
    {k:"tagline", label:"Kalimat pembuka di beranda", type:"textarea", rows:2, full:1},
    {group:"Sambutan"},
    {k:"sambutanNama", label:"Nama pemberi sambutan"},
    {k:"sambutanJabatan", label:"Jabatan"},
    {k:"sambutanTeks", label:"Isi sambutan", type:"textarea", rows:6, full:1},
    {k:"sambutanFoto", label:"Foto pemberi sambutan", type:"photo", full:1, nameKey:"sambutanNama"},
    {group:"Visi, misi, dan sejarah"},
    {k:"visi", label:"Visi", type:"textarea", rows:3, full:1},
    {k:"misi", label:"Misi", type:"textarea", rows:5, full:1, hint:"Satu baris untuk satu poin misi."},
    {k:"sejarah", label:"Sejarah singkat", type:"textarea", rows:5, full:1}
  ]},
  akreditasi:{title:"data akreditasi", fields:[
    {k:"peringkat", label:"Peringkat akreditasi", hint:"Contoh: Unggul, Baik Sekali, Baik"},
    {k:"lembaga", label:"Lembaga akreditasi", hint:"Contoh: LAMDIK atau BAN-PT"},
    {k:"nomorSK", label:"Nomor SK", full:1},
    {k:"tanggalSK", label:"Tanggal SK", type:"date"},
    {k:"berlaku", label:"Berlaku sampai", type:"date"},
    {k:"sertifikat", label:"Link sertifikat", type:"url", full:1, hint:"Link Google Drive ke file sertifikat (akses: siapa saja yang memiliki link)."},
    {k:"keterangan", label:"Keterangan tambahan", type:"textarea", rows:3, full:1}
  ]},
  kontak:{title:"kontak", fields:[
    {k:"alamat", label:"Alamat sekretariat", type:"textarea", rows:3, full:1},
    {k:"email", label:"Email", type:"email"},
    {k:"telepon", label:"Telepon / WhatsApp"},
    {k:"jam", label:"Jam layanan", full:1, hint:"Contoh: Senin–Jumat, 08.00–16.00"},
    {k:"maps", label:"Link Google Maps", type:"url", full:1}
  ]}
};
var SINGLE = {profil:1, kontak:1, akreditasi:1};
var formCtx = null;   // {type, id, vals}
var UPLOAD_MAX = 480;
var FILE_MAX = 20 * 1024 * 1024;

function fieldHtml(f, vals){
  if (f.group) return '<div class="fgroup">' + esc(f.group) + "</div>";
  var id = "f-" + f.k, v = vals[f.k] == null ? "" : vals[f.k];
  var lab = esc(f.label) + (f.req ? "<em>*</em>" : "");
  var hint = f.hint ? "<small>" + esc(f.hint) + "</small>" : "";
  var cls = "field" + (f.full ? " full" : "");
  if (f.type === "photo"){
    var ctl = assets
      ? '<label class="btn small ghost" for="' + id + '" style="cursor:pointer">' + (f.wide ? (v ? "Ganti gambar" : "Unggah gambar") : "Unggah foto") + '</label><input id="' + id + '" type="file" accept="image/*" data-photo="' + f.k + '" hidden>'
        + (v ? '<button type="button" class="btn small ghost" data-act="photo-clear" data-k="' + f.k + '">' + (f.wide ? "Hapus gambar" : "Hapus foto") + "</button>" : "")
      : '<small>Unggah foto tidak tersedia di tampilan ini.</small>';
    var prev = f.wide ? (v ? '<img class="ph-wide" src="' + esc(blob(v)) + '" alt="">' : '<div class="ph-wide ph-none">Belum ada gambar</div>') : avatar(vals[f.nameKey] || "?", v);
    return '<div class="' + cls + '"><span>' + lab + '</span><div class="photo' + (f.wide ? " wide" : "") + '" id="ph-' + f.k + '">' + prev + '<div class="btns">' + ctl + "</div></div>" + hint + "</div>";
  }
  if (f.type === "file"){
    var nm = vals[f.k + "Name"] || (v ? "File terlampir" : "");
    var fctl = assets
      ? '<label class="btn small ghost" for="' + id + '" style="cursor:pointer">' + (v ? "Ganti file" : "Unggah file") + '</label><input id="' + id + '" type="file" accept="application/pdf,image/*" data-file="' + f.k + '" hidden>'
        + (v ? '<button type="button" class="btn small ghost" data-act="file-clear" data-k="' + f.k + '">Hapus file</button>' : "")
      : '<small>Unggah file tidak tersedia di tampilan ini.</small>';
    return '<div class="' + cls + '"><span>' + lab + '</span><div class="filebox" id="fb-' + f.k + '">'
      + (v ? '<span class="fname"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/></svg>' + esc(nm) + "</span>" : '<span class="fname none">Belum ada file</span>')
      + '<div class="btns">' + fctl + "</div></div>" + hint + "</div>";
  }
  var input;
  if (f.type === "textarea") input = '<textarea id="' + id + '" name="' + f.k + '" rows="' + (f.rows||4) + '"' + (f.req ? " required" : "") + ">" + esc(v) + "</textarea>";
  else if (f.type === "select") input = '<select id="' + id + '" name="' + f.k + '">' + f.opts.map(function(o){ return '<option value="' + esc(o) + '"' + (o === v ? " selected" : "") + ">" + esc(o || "(kosong)") + "</option>"; }).join("") + "</select>";
  else input = '<input id="' + id + '" name="' + f.k + '" type="' + (f.type === "date" ? "date" : f.type === "email" ? "email" : f.type === "url" ? "url" : "text") + '" value="' + esc(v) + '"' + (f.req ? " required" : "") + (f.list ? ' list="kat-list"' : "") + (f.type === "url" ? ' placeholder="https://"' : "") + ">";
  return '<label class="' + cls + '" for="' + id + '"><span>' + lab + "</span>" + input + hint + "</label>";
}
function openForm(type, id, preset){
  var spec = FORMS[type], vals;
  if (SINGLE[type]) vals = Object.assign({}, S[type]);
  else if (id) vals = Object.assign({}, (S[type].filter(function(x){ return x.id === id; })[0] || {}));
  else vals = Object.assign(type === "berita" ? {kategori:"Berita", tanggal:today()} : {}, preset || {});
  formCtx = {type:type, id:id || null, vals:vals};
  var title = SINGLE[type] ? "Ubah " + spec.title : (id ? "Ubah " : "Tambah ") + spec.title;
  var cats = S.kategori.slice(); docCats().forEach(function(c){ if (cats.indexOf(c) < 0) cats.push(c); });
  var m = document.getElementById("modal");
  m.innerHTML = '<div class="sheet" role="dialog" aria-modal="true" aria-labelledby="ftitle"><header><h3 id="ftitle">' + esc(title) + '</h3><button type="button" data-act="close" aria-label="Tutup">×</button></header>'
    + '<form id="eform" novalidate><div class="fgrid">' + spec.fields.map(function(f){ return fieldHtml(f, vals); }).join("") + "</div>"
    + '<datalist id="kat-list">' + cats.map(function(c){ return '<option value="' + esc(c) + '">'; }).join("") + "</datalist>"
    + '<div class="form-foot"><button type="submit" class="btn" id="fsave">Simpan</button><button type="button" class="btn ghost" data-act="close">Batal</button><span class="fmsg" id="fmsg" role="status"></span></div></form></div>';
  m.hidden = false;
  var first = m.querySelector("input:not([type=file]),textarea,select");
  if (first) first.focus();
  m.querySelectorAll("input[data-photo]").forEach(function(inp){ inp.addEventListener("change", function(){ uploadPhoto(inp); }); });
  m.querySelectorAll("input[data-file]").forEach(function(inp){ inp.addEventListener("change", function(){ uploadFile(inp); }); });
  document.getElementById("eform").addEventListener("submit", submitForm);
}
function closeForm(){ var m = document.getElementById("modal"); if (m){ m.hidden = true; m.innerHTML = ""; } formCtx = null; }
function fmsg(t, err){ var el = document.getElementById("fmsg"); if (el){ el.textContent = t || ""; el.className = "fmsg" + (err ? " err" : ""); } }
function readForm(){
  FORMS[formCtx.type].fields.forEach(function(f){
    if (!f.k || f.type === "photo" || f.type === "file") return;
    var el = document.getElementById("f-" + f.k);
    if (el) formCtx.vals[f.k] = el.value.trim();
  });
}
function refreshPhoto(k){
  var f = FORMS[formCtx.type].fields.filter(function(x){ return x.k === k; })[0];
  readForm();
  var wrapEl = document.getElementById("ph-" + k);
  var tmp = document.createElement("div");
  tmp.innerHTML = fieldHtml(f, formCtx.vals);
  wrapEl.replaceWith(tmp.querySelector(".photo"));
  var inp = document.querySelector('input[data-photo="' + k + '"]');
  if (inp) inp.addEventListener("change", function(){ uploadPhoto(inp); });
}
function uploadPhoto(inp){
  var file = inp.files && inp.files[0];
  if (!file || !assets) return;
  if (!/^image\//.test(file.type)){ fmsg("Pilih file gambar (JPG atau PNG).", true); return; }
  if (file.size > 5 * 1024 * 1024){ fmsg("Ukuran gambar maksimal 5 MB.", true); return; }
  var spec = FORMS[formCtx.type].fields.filter(function(x){ return x.k === inp.dataset.photo; })[0] || {};
  UPLOAD_MAX = spec.wide ? 1280 : 480;
  fmsg("Mengunggah gambar…");
  assets.upload(file).then(function(r){
    formCtx.vals[inp.dataset.photo] = r.id;
    refreshPhoto(inp.dataset.photo);
    fmsg("Gambar terunggah. Klik Simpan untuk menyimpan.");
  }).catch(function(){ fmsg("Gambar gagal diunggah. Coba file lain atau ulangi.", true); });
}
function refreshFile(k){
  var f = FORMS[formCtx.type].fields.filter(function(x){ return x.k === k; })[0];
  readForm();
  var tmp = document.createElement("div");
  tmp.innerHTML = fieldHtml(f, formCtx.vals);
  document.getElementById("fb-" + k).replaceWith(tmp.querySelector(".filebox"));
  var inp = document.querySelector('input[data-file="' + k + '"]');
  if (inp) inp.addEventListener("change", function(){ uploadFile(inp); });
}
function uploadFile(inp){
  var file = inp.files && inp.files[0];
  if (!file || !assets) return;
  if (!/^application\/pdf$|^image\//.test(file.type)){ fmsg("File harus PDF atau gambar. Untuk Word/Excel, simpan sebagai PDF dulu atau pakai link Google Drive.", true); return; }
  if (file.size > FILE_MAX){ fmsg("Ukuran file maksimal " + Math.round(FILE_MAX / 1048576) + " MB. Untuk file besar, pakai link Google Drive.", true); return; }
  UPLOAD_MAX = 1600;
  fmsg("Mengunggah file\u2026");
  assets.upload(file).then(function(r){
    formCtx.vals[inp.dataset.file] = r.id;
    formCtx.vals[inp.dataset.file + "Name"] = file.name;
    refreshFile(inp.dataset.file);
    fmsg("File terunggah. Klik Simpan untuk menyimpan.");
  }).catch(function(e){ fmsg(e && e.code === "unsupported_type" ? "Jenis file ini tidak didukung. Gunakan PDF." : "File gagal diunggah. Coba lagi.", true); });
}
function submitForm(e){
  e.preventDefault();
  if (!formCtx) return;
  readForm();
  var spec = FORMS[formCtx.type], v = formCtx.vals;
  for (var i = 0; i < spec.fields.length; i++){
    var f = spec.fields[i];
    if (!f.k) continue;
    if (f.req && !String(v[f.k]||"").trim()){ fmsg("Kolom “" + f.label + "” wajib diisi.", true); var el = document.getElementById("f-" + f.k); if (el) el.focus(); return; }
    if (f.type === "url" && v[f.k] && !isUrl(v[f.k])){ fmsg("Link “" + f.label + "” harus diawali https://", true); document.getElementById("f-" + f.k).focus(); return; }
  }
  var type = formCtx.type, id = formCtx.id, label = spec.title;
  commit(function(st){
    if (SINGLE[type]){
      st[type] = Object.assign({}, st[type], v);
      if (type === "profil") st.profil.singkatan = String(st.profil.singkatan||"").slice(0,4);
      if (type === "akreditasi"){ st.profil.akreditasi = st.akreditasi.peringkat; st.profil.akreditasiKet = st.akreditasi.keterangan; }
      return;
    }
    if (type === "dokumen" && v.kategori && st.kategori.indexOf(v.kategori) < 0) st.kategori.push(v.kategori);
    if (id){
      st[type] = st[type].map(function(x){ return x.id === id ? Object.assign({}, x, v, {id:id}) : x; });
    } else {
      st[type].push(Object.assign({}, v, {id:uid(), dibuat:today()}));
    }
  }, SINGLE[type] ? "Perubahan " + label + " tersimpan." : (id ? "Perubahan tersimpan." : "Data " + label + " ditambahkan."));
}

/* ===== simpan ===== */
var READONLY = ["not_writer","not_granted","not_declared","capability_disabled","capability_removed","consent_required"];
function commit(mutate, okMsg){
  if (busy || !art) return;
  busy = true;
  var btn = document.getElementById("fsave");
  if (btn){ btn.disabled = true; fmsg("Menyimpan…"); }
  var next = JSON.parse(JSON.stringify(S));
  mutate(next);
  store.set("pti_edit", "1"); store.set("pti_view", view); store.set("pti_toast", okMsg);
  art.publish(buildDoc(next)).then(function(){
    S = next; if (STANDALONE){ dirty = true; store.set("pti_toast", null); } closeForm(); render(); toast(STANDALONE ? okMsg + " Jangan lupa unduh data.js terbaru." : okMsg);
    busy = false;
  }).catch(function(err){
    busy = false;
    store.set("pti_toast", null);
    if (btn){ btn.disabled = false; }
    var c = err && err.code;
    if (c === "conflict"){ store.set("pti_toast", "Ada perubahan dari editor lain. Halaman dimuat ulang, silakan ulangi perubahan Anda."); fmsg("Ada perubahan dari editor lain. Memuat ulang…", true); return; }
    if (READONLY.indexOf(c) >= 0){ canEdit = false; editMode = false; store.set("pti_edit", null); closeForm(); render(); toast("Halaman ini hanya bisa dilihat. Perubahan tidak tersimpan.", true); return; }
    var msg = c === "too_large" ? "Data terlalu besar untuk disimpan." : c === "rate_limited" ? "Terlalu sering menyimpan. Tunggu sebentar lalu coba lagi." : "Gagal menyimpan. Periksa koneksi lalu coba lagi.";
    if (document.getElementById("eform")) fmsg(msg, true); else toast(msg, true);
  });
}
function removeItem(type, id){
  var item = S[type].filter(function(x){ return x.id === id; })[0];
  if (!item) return;
  commit(function(st){ st[type] = st[type].filter(function(x){ return x.id !== id; }); }, "“" + (item.judul || item.nama) + "” dihapus.");
}

/* ===== klik ===== */
function copyText(text, btn){
  var done = function(){ var t = btn.textContent; btn.textContent = "Tersalin"; setTimeout(function(){ btn.textContent = t; }, 1500); };
  var fallback = function(){ var r = document.createRange(); var s = document.createElement("span"); s.textContent = text; s.style.cssText = "position:fixed;left:-9999px"; document.body.appendChild(s); r.selectNodeContents(s); var sel = getSelection(); sel.removeAllRanges(); sel.addRange(r); try { document.execCommand("copy"); done(); } catch(e){ toast("Tekan Ctrl + C untuk menyalin."); } s.remove(); };
  try { navigator.clipboard.writeText(text).then(done, fallback); } catch(e){ fallback(); }
}
root.addEventListener("click", function(e){
  var g = e.target.closest("[data-go]");
  if (g){ e.preventDefault(); go(g.dataset.go); return; }
  var b = e.target.closest("[data-act]");
  if (!b) return;
  var act = b.dataset.act;
  if (act === "enter-edit"){ editMode = true; store.set("pti_edit","1"); render(); toast("Mode Editor aktif. Gunakan tombol Tambah, Ubah, dan Hapus."); }
  else if (act === "exit-edit"){ editMode = false; store.set("pti_edit", null); render(); }
  else if (act === "add") openForm(b.dataset.type, null, b.dataset.kat ? {kategori:b.dataset.kat} : null);
  else if (act === "edit") openForm(b.dataset.type, b.dataset.id);
  else if (act === "form") openForm(b.dataset.type);
  else if (act === "close") closeForm();
  else if (act === "photo-clear"){ formCtx.vals[b.dataset.k] = ""; refreshPhoto(b.dataset.k); }
  else if (act === "file-clear"){ formCtx.vals[b.dataset.k] = ""; formCtx.vals[b.dataset.k + "Name"] = ""; refreshFile(b.dataset.k); }
  else if (act === "del"){
    if (b.dataset.confirm !== "1"){ b.dataset.confirm = "1"; b.textContent = "Yakin hapus?"; setTimeout(function(){ if (b.isConnected){ b.dataset.confirm = ""; b.textContent = "Hapus"; } }, 4000); return; }
    b.disabled = true; b.textContent = "Menghapus…";
    removeItem(b.dataset.type, b.dataset.id);
  }
  else if (act === "doc-cat"){ docCat = b.dataset.cat; render(); }
  else if (act === "news-cat"){ newsCat = b.dataset.cat; render(); }
  else if (act === "more"){ var body = b.closest(".post").querySelector(".body"); body.classList.toggle("clamp"); b.textContent = body.classList.contains("clamp") ? "Baca selengkapnya" : "Tutup"; }
  else if (act === "copy") copyText(b.dataset.link, b);
  else if (act === "download") downloadFile();
  else if (act === "welcome-more"){ var wt = b.parentNode.querySelector(".wl-text"); wt.classList.toggle("clamped"); b.textContent = wt.classList.contains("clamped") ? "Baca sambutan lengkap" : "Tutup sambutan"; }
});
root.addEventListener("click", function(e){ if (e.target.id === "modal") closeForm(); });
document.addEventListener("keydown", function(e){ if (e.key === "Escape" && formCtx) closeForm(); });

function dataJs(st){
  return "/* Isi website Prodi PTI. Diperbarui lewat Mode Editor > Unduh data.js terbaru. */\nwindow.PTI_DATA = " + JSON.stringify(st, null, 2) + ";\n";
}
function downloadFile(){
  try {
    var url = URL.createObjectURL(new Blob([dataJs(S)], {type:"text/javascript"}));
    var a = document.createElement("a");
    a.href = url; a.download = "data.js"; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function(){ URL.revokeObjectURL(url); }, 4000);
    dirty = false; render(); toast("File data.js diunduh. Ganti file js/data.js yang lama dengan file ini.");
  } catch(e){ toast("Gagal mengunduh file. Coba browser lain.", true); }
}
function readDataUrl(file){
  return new Promise(function(ok, no){ var r = new FileReader(); r.onload = function(){ ok({id: r.result}); }; r.onerror = no; r.readAsDataURL(file); });
}
function resizeImage(file, maxSize){
  return new Promise(function(ok, no){
    var img = new Image(), u = URL.createObjectURL(file);
    img.onload = function(){
      var max = maxSize || 480, w = img.naturalWidth, h = img.naturalHeight, k = Math.min(1, max / Math.max(w, h));
      var c = document.createElement("canvas"); c.width = Math.round(w*k); c.height = Math.round(h*k);
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(u); ok({id: c.toDataURL("image/jpeg", 0.85)});
    };
    img.onerror = function(){ URL.revokeObjectURL(u); no(new Error("gambar")); };
    img.src = u;
  });
}

/* ===== mulai ===== */
var h = (location.hash || "").replace("#","");
go(VIEWS.indexOf(h) >= 0 ? h : (store.get("pti_view") || "beranda"));

var C = window.claude;
if (STANDALONE){
  /* File mandiri: Mode Editor muncul bila dibuka dari komputer (file://) atau dengan ?admin di akhir alamat */
  canEdit = location.protocol === "file:" || /[?&]admin\b/.test(location.search);
  if (canEdit){
    art = { publish: function(){ return Promise.resolve({}); } };
    assets = { upload: function(f){ return /^image\//.test(f.type) ? resizeImage(f, UPLOAD_MAX) : readDataUrl(f); } };
    FILE_MAX = 3 * 1024 * 1024;
    document.addEventListener("click", function(e){ var a = e.target.closest && e.target.closest('a[href^="data:"]'); if (!a) return; e.preventDefault(); fetch(a.href).then(function(r){ return r.blob(); }).then(function(bl){ var u = URL.createObjectURL(bl); var w = window.open(u, "_blank"); if (!w) location.href = u; }); }, true);
    editMode = store.get("pti_edit") === "1";
    render();
  }
  window.addEventListener("beforeunload", function(e){ if (dirty){ e.preventDefault(); e.returnValue = ""; } });
} else if (C && C.use){
  Promise.all([C.use("artifact"), C.use("user")]).then(function(r){
    art = r[0];
    var user = r[1];
    if (!art || !user) return false;
    return user.canEdit();
  }).then(function(ok){
    if (!ok) return;
    canEdit = true;
    editMode = store.get("pti_edit") === "1";
    return C.use("assets").then(function(a){ assets = a; });
  }).then(function(){
    render();
    var t = store.get("pti_toast");
    if (t){ store.set("pti_toast", null); toast(t); }
  }).catch(function(){});
}
})();

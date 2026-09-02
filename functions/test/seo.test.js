"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path");
const root=path.resolve(__dirname,"../..");
const routes=[
  ["index.html","https://ovexi.hu/"],
  ["pages/weboldal-keszites.html","https://ovexi.hu/weboldal-keszites"],
  ["pages/marketing-kisvallalkozasoknak.html","https://ovexi.hu/marketing-kisvallalkozasoknak"],
  ["pages/weboldal-karbantartas.html","https://ovexi.hu/weboldal-karbantartas"]
];
function read(file){return fs.readFileSync(path.join(root,file),"utf8");}
test("SEO: indexable landing pages have unique metadata, canonical URL and one H1",()=>{const titles=new Set(),descriptions=new Set();for(const [file,url] of routes){const html=read(file),title=html.match(/<title>([^<]+)<\/title>/)?.[1],description=html.match(/<meta name="description" content="([^"]+)"/)?.[1];assert.ok(title&&title.length>=20&&title.length<=70,file);assert.ok(description&&description.length>=80&&description.length<=180,file);assert.equal((html.match(/<h1[ >]/g)||[]).length,1,file);assert.ok(html.includes(`<link rel="canonical" href="${url}">`),file);assert.match(html,/meta name="robots" content="index,follow/);assert.ok(!titles.has(title),title);assert.ok(!descriptions.has(description),description);titles.add(title);descriptions.add(description);}});
test("SEO: every JSON-LD block is valid and service pages are internally linked",()=>{const main=read("index.html");for(const [file,url] of routes){const html=read(file);for(const match of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g))assert.doesNotThrow(()=>JSON.parse(match[1]),file);if(file!=="index.html")assert.ok(main.includes(`href="${new URL(url).pathname}"`),url);}});
test("SEO: sitemap contains only canonical public landing pages and robots protects private routes",()=>{const sitemap=read("sitemap.xml"),robots=read("robots.txt");for(const [,url] of routes)assert.ok(sitemap.includes(`<loc>${url}</loc>`),url);for(const privateRoute of ["/admin","/ugyfelter","/foglalas","/pages/"])assert.ok(robots.includes(`Disallow: ${privateRoute}`),privateRoute);assert.ok(!sitemap.includes("cookie-policy"));});
test("performance: storefront defers Firebase until analytics consent or order submission",()=>{const js=read("js/main.js"),css=read("css/site.css");assert.doesNotMatch(js,/^import .*firebase/m);assert.match(js,/async function firestoreSdk/);assert.doesNotMatch(css,/fonts\.googleapis\.com/);assert.ok(fs.statSync(path.join(root,"assets/images/logo-256.png")).size<30000);assert.ok(fs.statSync(path.join(root,"assets/images/og-ovexi-1200.jpg")).size<250000);});

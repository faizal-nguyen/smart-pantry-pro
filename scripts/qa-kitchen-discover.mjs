// npm run test:v10:ui, then KITCHEN_DISCOVER_PORT=5174 node scripts/qa-kitchen-discover.mjs.
// Synthetic data only; this never signs in or calls a paid provider.
import {chromium,expect} from '@playwright/test';
import {mkdir} from 'node:fs/promises';
const port=process.env.KITCHEN_DISCOVER_PORT??'5174';
const base=`http://127.0.0.1:${port}/scripts/fixtures/v10/index.html`;
const output=new URL('../output/kitchen-discover/',import.meta.url).pathname;
await mkdir(output,{recursive:true});
const browser=await chromium.launch({headless:true});let page;
try {
 const context=await browser.newContext();page=await context.newPage();
 const errors=[];page.on('pageerror',error=>{errors.push(error.message);console.error('PAGEERROR',error.message);});
 const url=new URL(base);url.searchParams.set('scene','carnet');url.searchParams.set('route','/kitchen/recipes?tab=discover');url.searchParams.set('discoveryLostReply','1');
 await page.goto(url.href,{waitUntil:'networkidle'});
 await expect(page.getByRole('tab',{name:'Découvrir',exact:true})).toHaveAttribute('aria-selected','true');
 for(const width of [320,390,440,768,1024,1280]) {
  await page.setViewportSize({width,height:width<768?844:900});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
  await expect(page.getByRole('heading',{name:'À découvrir',exact:true})).toBeVisible();
  if([390,1280].includes(width)) await page.screenshot({path:`${output}/discover-${width}.png`,fullPage:width>768,animations:'disabled'});
 }
 const expired=page.getByRole('listitem',{name:'Riz du test local — aperçu expiré',exact:true});
 await expect(expired).toContainText('Photo indisponible');await expect(expired.getByRole('link',{name:/Voir la source/})).toBeVisible();
 const item=page.getByRole('listitem',{name:'Gratin fictif à compléter',exact:true});
 await item.getByRole('button',{name:'Garder',exact:true}).click();
 const editor=page.getByRole('dialog',{name:'Vérifier et ajouter',exact:true});
 await expect(editor).toBeVisible();
 await expect(editor.getByRole('textbox',{name:'Portions',exact:true})).toHaveValue('');
 await expect(editor.getByRole('textbox',{name:'Quantité de l’ingrédient 1'})).toHaveValue('');
 await expect(editor.getByRole('button',{name:'Ajouter à mes recettes',exact:true})).toBeDisabled();
 await editor.getByRole('textbox',{name:'Titre du plat',exact:true}).fill('Gratin personnel vérifié');
 for(const width of [320,390,440,1280]) {
  await page.setViewportSize({width,height:844});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
  await expect(editor).toBeVisible();
  if(width===390)await page.screenshot({path:`${output}/review-390.png`,animations:'disabled'});
 }
 await editor.getByRole('checkbox',{name:'J’ai vérifié les ingrédients et les étapes dans la source.',exact:true}).check();
 await expect(editor.getByRole('button',{name:'Ajouter à mes recettes',exact:true})).toBeDisabled();
 await editor.getByRole('checkbox',{name:'Je garde les informations manquantes à vérifier avant de cuisiner.',exact:true}).check();
 await editor.getByRole('button',{name:'Ajouter à mes recettes',exact:true}).click();
 await expect(editor.getByRole('alert')).toContainText(/Réponse.*perdue/);
 await editor.getByRole('button',{name:'Vérifier l’ajout',exact:true}).click();
 await expect(page.getByRole('dialog',{name:'Recette ajoutée',exact:true})).toBeVisible();
 const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('v10-discovery-fixture')).items.find(item=>item.draft?.title==='Gratin personnel vérifié'));
 const data=await page.evaluate(()=>JSON.parse(localStorage.getItem('v10-carnet-fixture-data')));
 const rows=data.recipes.filter(recipe=>recipe.id===saved.recipeReference.id);
 expect(rows).toHaveLength(1);expect(rows[0].name).toBe('Gratin personnel vérifié');expect(rows[0].servings).toBeNull();
 await page.getByRole('link',{name:'Voir ma recette et cuisiner',exact:true}).click();
 await expect(page.getByRole('heading',{level:1})).toHaveText('Gratin personnel vérifié');
 await expect(page.getByRole('button',{name:'Commencer',exact:true})).toBeDisabled();
 await page.getByRole('button',{name:'Retour aux recettes',exact:true}).click();
 await page.getByRole('tab',{name:'Découvrir',exact:true}).click();
 const added=page.getByRole('listitem',{name:'Gratin personnel vérifié',exact:true});
 await expect(added).toContainText('Ajoutée à mes recettes');
 await added.getByText('Mon avis après cuisine',{exact:true}).click();
 await expect(added.getByRole('button',{name:'À refaire',exact:true})).toBeDisabled();
 await added.getByRole('checkbox',{name:'J’ai cuisiné cette recette',exact:true}).check();
 await added.getByRole('button',{name:'À refaire',exact:true}).click();
 await expect(added.getByRole('button',{name:'À refaire',exact:true})).toHaveAttribute('aria-pressed','true');
 await page.getByText('Mes créateurs et mes liens',{exact:true}).click();
 await page.getByRole('button',{name:'Mettre en pause Olivier Lin',exact:true}).click();
 await expect(added.getByRole('link',{name:'Voir ma recette',exact:true})).toBeVisible();
 await expect(page.getByRole('button',{name:'Reprendre Olivier Lin',exact:true})).toBeVisible();
 await page.getByRole('tab',{name:'Importer',exact:true}).click();
 const onboarding=page.getByRole('dialog',{name:'Importe tes 5 premières recettes',exact:true});
 await onboarding.getByRole('button',{name:'Plus tard',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Importer un lien',exact:true})).toBeVisible();
 expect(errors).toEqual([]);
 console.log('PASS six largeurs, aperçu expiré, garder, source et inconnues explicites, réponse perdue reprise sans doublon, vraie fiche, avis après cuisine et pause conservant la recette ; onglet Importer commun.');
} catch(error) {if(page){console.log((await page.locator('body').innerText()).slice(-4500));await page.screenshot({path:`${output}/failure.png`,fullPage:true});}throw error;} finally {await browser.close();}

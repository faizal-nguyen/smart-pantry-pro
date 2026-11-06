// Run npm run test:v10:ui, then node scripts/qa-kitchen-os.mjs.
// Every request stays on the existing localhost fixture; no production session is used.
import { chromium, expect } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const output=fileURLToPath(new URL('../output/kitchen-os/',import.meta.url));
await mkdir(output,{recursive:true});
const entry='http://127.0.0.1:5174/scripts/fixtures/v10/index.html';
const sceneUrl=new URL(entry);
sceneUrl.searchParams.set('scene','carnet');
sceneUrl.searchParams.set('route','/kitchen');
let browser,page;
try {
  browser=await chromium.launch({headless:true});
  page=await browser.newPage({viewport:{width:1280,height:800},deviceScaleFactor:1});
  const errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  page.on('response',response=>{if(response.status()>=500)errors.push(`HTTP ${response.status()} ${response.url()}`);});
  await page.addInitScript(()=>localStorage.setItem('theme','light'));
  await page.goto(sceneUrl.href,{waitUntil:'networkidle'});
  const featured=page.locator('.culinary-featured-list');
  await expect(featured).toContainText('Couscous de légumes rôtis');
  for(const width of [320,390,768,899,900,974,1024,1280,1440]) {
    await page.setViewportSize({width,height:width<900?844:width===974?620:800});
    await expect(page.locator('.kitchen-bottom-nav'))[width<900?'toBeVisible':'toBeHidden']();
    await expect(page.locator('.kitchen-desktop-nav'))[width>=900?'toBeVisible':'toBeHidden']();
    expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    for(const control of await page.locator('.kitchen-header-inner button:visible,.kitchen-header-inner a:visible').all()) {
      const box=await control.boundingBox();expect(box.x).toBeGreaterThanOrEqual(0);expect(box.x+box.width).toBeLessThanOrEqual(width);
    }
    const action=await featured.getByRole('link',{name:'Voir la recette',exact:true}).boundingBox();
    if(width<900) {
      const nav=await page.locator('.kitchen-bottom-nav').boundingBox();expect(action.y+action.height).toBeLessThan(nav.y);
      if(width===390) {
        const last=await page.locator('.kitchen-stock-item').last().boundingBox();expect(last.y+last.height).toBeLessThan(nav.y);
      }
    } else {
      const photo=await featured.locator('.culinary-recipe-image-link').boundingBox();
      const copy=await featured.locator('.culinary-recipe-copy').boundingBox();
      const card=await featured.boundingBox();
      const week=await page.locator('.kitchen-week').boundingBox();
      expect(photo.x+photo.width).toBeLessThanOrEqual(copy.x+1);
      expect(Math.abs(card.y-week.y)).toBeLessThan(2);
      expect(card.height/card.width).toBeLessThan(.46);
    }
    if([390,974,1280].includes(width)) {
      const name=width===390?'mobile':width===974?'reference-size':'desktop';
      await page.screenshot({path:`${output}/${name}.png`});
    }
    console.log(`PASS composition ${width}px, action principale visible`);
  }
  const recipes=page.getByRole('button',{name:'Recettes',exact:true});
  await recipes.focus();await page.keyboard.press('Enter');
  await expect(page.getByRole('menuitem',{name:'Menus',exact:true})).toHaveAttribute('href','/kitchen/meal-planning');
  await page.keyboard.press('Escape');await expect(recipes).toBeFocused();
  await featured.getByRole('button',{name:'Autres idées',exact:true}).click();
  const ideas=page.getByRole('dialog',{name:'D’autres idées pour ton repas'});
  await expect(ideas).toBeVisible();
  await expect(ideas.getByText('Pourquoi cette recette ?', {exact:true}).first()).toBeVisible();
  await page.screenshot({path:`${output}/alternatives.png`});
  await page.keyboard.press('Escape');await expect(featured.getByRole('button',{name:'Autres idées'})).toBeFocused();
  console.log('PASS alternatives, preuves du choix et retour du focus');
  await page.getByRole('button',{name:/Une envie, une contrainte/}).click();
  await expect(page.getByRole('combobox',{name:'Temps disponible'})).toBeVisible();
  await page.getByRole('combobox',{name:'Portions pour ce repas'}).selectOption('3');
  await page.getByRole('button',{name:'Voir les idées',exact:true}).click();
  await expect(featured).toContainText('3 personnes');
  console.log('PASS réglage du repas conservé');
  await page.getByRole('button',{name:'Profil et paramètres',exact:true}).click();
  await page.getByRole('menuitem',{name:'Aide pour cette tâche',exact:true}).click();
  await expect(page.getByRole('textbox',{name:'Votre question'})).toBeVisible();
  await page.keyboard.press('Escape');
  await featured.getByRole('link',{name:'Voir la recette',exact:true}).click();
  await expect(page.getByRole('heading',{level:1})).toContainText('Couscous de légumes rôtis');
  await page.getByRole('link',{name:'Kitchen OS — accueil'}).click();
  await page.getByRole('button',{name:'Profil et paramètres',exact:true}).click();
  await page.getByRole('menuitem',{name:'Mon compte et déconnexion'}).click();
  await expect(page.getByRole('button',{name:'Se déconnecter',exact:true})).toBeVisible();
  console.log('PASS aide, ouverture de recette et accès au compte');
  for(const [route,slug] of [['/kitchen/recipes','recettes'],['/pantry/inventory','stock'],['/shopping/list','courses'],['/kitchen/meal-planning','menus'],['/assistant','assistant'],['/settings','reglages']]) {
    const url=new URL(sceneUrl);url.searchParams.set('route',route);
    for(const width of [320,390,768,900,1024,1280]) {
      await page.setViewportSize({width,height:width<900?844:900});
      await page.goto(url.href,{waitUntil:'networkidle'});
      await expect(page.getByRole('heading',{level:1})).toBeVisible();
      expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
      if(route==='/assistant') {
        const composer=await page.getByRole('textbox',{name:"Message à envoyer à l'assistant"}).boundingBox();
        const nav=width<900 ? await page.locator('.kitchen-bottom-nav').boundingBox() : null;
        expect(composer.y).toBeGreaterThan(0);
        expect(composer.y+composer.height).toBeLessThanOrEqual(nav?.y ?? 900);
      }
      if([390,1280].includes(width)) await page.screenshot({path:`${output}/${slug}-${width}.png`,fullPage:width>=900});
    }
    console.log(`PASS ${route} six largeurs, 320 à 1280px`);
  }
  // Exercise the shared UI with actual fixture mutations, never a production API.
  const visit=async route=>{const url=new URL(sceneUrl);url.searchParams.set('route',route);await page.goto(url.href,{waitUntil:'networkidle'});};
  await page.setViewportSize({width:390,height:844});
  await visit('/kitchen/recipes');
  await page.getByRole('searchbox').fill('introuvable');
  await page.getByRole('button',{name:'Retirer les filtres et la recherche'}).click();
  await expect(page.getByRole('heading',{name:'Couscous de légumes rôtis'})).toBeVisible();
  await page.getByRole('link',{name:/Couscous de légumes rôtis/}).click();
  await expect(page.getByRole('heading',{level:1})).toHaveText('Couscous de légumes rôtis');
  for(const width of [320,390,768,899,900,1024,1280]) {
    await page.setViewportSize({width,height:844});
    expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    await expect(page.getByTestId('recipe-action-bar-mobile'))[width<900?'toBeVisible':'toBeHidden']();
    if(width<900) {
      const bar=await page.getByTestId('recipe-action-bar-mobile').boundingBox();
      const nav=await page.locator('.kitchen-bottom-nav').boundingBox();
      expect(bar.y+bar.height).toBeLessThanOrEqual(nav.y+1);
    }
    if([390,1280].includes(width)) { await page.evaluate(()=>window.scrollTo(0,0));await page.screenshot({path:`${output}/fiche-${width}.png`,fullPage:width>=900}); }
  }
  console.log('PASS recherche, retrait des filtres et fiche à sept largeurs');
  await page.setViewportSize({width:390,height:844});
  await visit('/shopping/list');
  await page.getByRole('button',{name:'Ajouter',exact:true}).click();
  await page.getByRole('textbox',{name:'Ajouter un produit'}).fill('Lentilles QA');
  await page.getByRole('button',{name:'Préciser la quantité'}).click();
  await page.getByRole('textbox',{name:'Quantité',exact:true}).fill('250');
  await page.getByRole('textbox',{name:'Unité',exact:true}).fill('g');
  await page.getByRole('button',{name:'Ajouter aux courses',exact:true}).click();
  const purchase=page.getByRole('checkbox',{name:'Marquer acheté : Lentilles QA',exact:true});
  await purchase.scrollIntoViewIfNeeded();
  await purchase.click();
  await expect(page.getByRole('checkbox',{name:'Remettre à acheter : Lentilles QA',exact:true})).toBeChecked();
  const transfer=page.getByRole('button',{name:/Ranger mes achats|Vérifier le rangement/});
  await expect(transfer).toBeEnabled();
  const transferBox=await transfer.boundingBox(), nav=await page.locator('.kitchen-bottom-nav').boundingBox();
  expect(transferBox.y+transferBox.height).toBeLessThanOrEqual(nav.y+1);
  await page.screenshot({path:`${output}/courses-coches-390.png`});
  await transfer.click();
  const storage=page.getByRole('dialog',{name:'Ranger mes achats'});
  await expect(storage.getByRole('textbox',{name:'Quantité de rangement de Lentilles QA'})).toHaveValue('250');
  await storage.getByRole('button',{name:'Confirmer le rangement'}).click();
  await expect(storage.getByRole('status')).toHaveText('Achats rangés. Le stock est à jour.');
  await storage.getByRole('link',{name:'Voir mon stock'}).click();
  await expect(page.getByRole('heading',{name:'Lentilles QA',exact:true})).toBeVisible();
  await page.getByRole('searchbox').fill('Lentilles QA');
  await expect(page.locator('.kitchen-stock-row')).toHaveCount(1);
  console.log('PASS ajout, achat, confirmation du rangement et recherche dans le stock');
  await visit('/kitchen/recipes');
  await page.getByRole('link',{name:/Couscous de légumes rôtis/}).click();
  await page.getByRole('spinbutton',{name:'Portions à préparer'}).fill('3');
  await expect(page.getByText('150 g Courgettes',{exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Mettre en favori',exact:true}).click();
  await expect(page.getByRole('button',{name:'Retirer des favoris',exact:true})).toHaveAttribute('aria-pressed','true');
  const stockBefore=await page.evaluate(()=>JSON.parse(localStorage.getItem('v10-carnet-fixture-data')).inventory);
  await page.getByRole('button',{name:'Commencer cette recette',exact:true}).click();
  await expect(page.getByRole('spinbutton',{name:'Nombre de portions'})).toHaveValue('3');
  const sessionPath=(await page.getByLabel('Contrôles du test local').textContent()).match(/Écran : (\/kitchen\/cooking\/[a-z0-9-]+)/)[1];
  await page.getByRole('button',{name:'Commencer les étapes',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Étape 1 sur 3'})).toBeVisible();
  await page.getByRole('button',{name:'Suivante',exact:true}).click();
  await page.getByRole('button',{name:'Suivante',exact:true}).click();
  await page.getByRole('button',{name:'J’ai terminé : vérifier les ingrédients',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Ce que tu as utilisé'})).toBeVisible();
  expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('v10-carnet-fixture-data')).inventory)).toEqual(stockBefore);
  await page.getByRole('button',{name:'Confirmer et mettre à jour le stock',exact:true}).click();
  await expect(page.getByRole('status').filter({hasText:'Le stock et le journal sont confirmés'})).toBeVisible();
  const stockAfter=await page.evaluate(()=>JSON.parse(localStorage.getItem('v10-carnet-fixture-data')).inventory);
  const courgettes=stockBefore.find(lot=>lot.product_id==='10000000-0000-4000-8000-000000000001');
  expect(stockAfter.find(lot=>lot.id===courgettes.id).quantity).toEqual(courgettes.quantity-150);
  await page.screenshot({path:`${output}/cuisson-confirmee-390.png`,fullPage:true});
  await visit(sessionPath);
  await expect(page.getByRole('status').filter({hasText:'Le stock et le journal sont confirmés'})).toBeVisible();
  expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('v10-carnet-fixture-data')).inventory)).toEqual(stockAfter);
  console.log('PASS favoris, portions et cuisson : aucun stock retiré avant confirmation, déduction confirmée une fois');
  await visit('/settings');
  await page.getByRole('link',{name:/Apparence/}).click();
  await expect(page.getByRole('heading',{name:'Apparence',exact:true,level:2})).toBeFocused();
  await expect(page.getByRole('navigation',{name:'Rubriques des paramètres'})).toBeHidden();
  await page.getByRole('link',{name:'Toutes les rubriques'}).click();
  await expect(page.getByRole('navigation',{name:'Rubriques des paramètres'})).toBeVisible();
  await visit('/assistant');
  await page.setViewportSize({width:390,height:500});
  const input=page.getByRole('textbox',{name:"Message à envoyer à l'assistant"});
  await input.fill('Une idée avec mes légumes ?');
  const inputBox=await input.boundingBox(), shortNav=await page.locator('.kitchen-bottom-nav').boundingBox();
  expect(inputBox.y).toBeGreaterThan(0);
  expect(inputBox.y+inputBox.height).toBeLessThanOrEqual(shortNav.y);
  await expect(page.getByRole('button',{name:'Envoyer',exact:true})).toBeEnabled();
  console.log('PASS réglages, retour du focus et saisie assistant sur écran court (sans envoi)');
  await page.setViewportSize({width:1280,height:800});
  await page.goto(sceneUrl.href,{waitUntil:'networkidle'});
  await page.evaluate(()=>{localStorage.setItem('theme','dark');window.dispatchEvent(new StorageEvent('storage',{key:'theme',newValue:'dark'}));});
  await expect(page.locator('html')).toHaveClass(/dark/);
  await page.locator('body').evaluate(element=>Promise.all(element.getAnimations().map(animation=>animation.finished)));
  await page.screenshot({path:`${output}/dark.png`});
  console.log('PASS thème sombre');
  // The ordinary fixture retains its robustness scenarios, separate from the presentation scene.
  await page.goto(entry+'?route=%2Fkitchen',{waitUntil:'networkidle'});
  await page.getByText('Test local — données fictives · contrôles',{exact:true}).click();
  await page.getByRole('button',{name:'Stock vide',exact:true}).click();
  await expect(page.locator('.kitchen-use-soon')).toContainText('Aucune date proche renseignée.');
  await expect(page.locator('.culinary-recipe-availability').first()).toContainText('acheter ou à vérifier');
  await page.screenshot({path:`${output}/stock-empty.png`,fullPage:true});
  await page.getByRole('button',{name:'Refuser la vérification',exact:true}).click();
  await expect(page.getByRole('button',{name:'Réessayer les idées'})).toBeVisible();
  await expect(page.locator('.culinary-featured-list')).toHaveCount(0);
  await page.screenshot({path:`${output}/recommendations-error.png`,fullPage:true});
  console.log('PASS stock vide et vérification indisponible, sans fausse disponibilité');
  expect(errors).toEqual([]);console.log('PASS aucune erreur JavaScript ni réponse HTTP 500');
} catch(error) {
  console.error(error);
  if(page) {console.log((await page.locator('body').innerText()).slice(0,4000));await page.screenshot({path:`${output}/failure.png`,fullPage:true});}
  process.exitCode=1;
} finally {await browser?.close();}

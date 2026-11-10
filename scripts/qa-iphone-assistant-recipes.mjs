// Start npm run test:v10:ui first. Uses fictitious local data only.
import {chromium,webkit,expect} from '@playwright/test';
import {mkdir} from 'node:fs/promises';
const output=new URL('../output/iphone-responsive/',import.meta.url).pathname;
await mkdir(output,{recursive:true});
const entry='http://127.0.0.1:5174/scripts/fixtures/v10/index.html?scene=carnet&route=';
for(const engine of [webkit,chromium]){
  const browser=await engine.launch({headless:true});
  const page=await browser.newPage({viewport:{width:390,height:664},isMobile:true,hasTouch:true});
  const errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  // Reproduce Safari's keyboard: visual viewport shrinks, layout viewport stays tall.
  await page.addInitScript(()=>{
    let height;
    Object.defineProperty(window.visualViewport,'height',{get:()=>height??window.innerHeight});
    window.setTestVisibleHeight=value=>{height=value;window.visualViewport.dispatchEvent(new Event('resize'));};
  });
  const visit=route=>page.goto(entry+encodeURIComponent(route),{waitUntil:'networkidle'});
  const inside=async(locator,width)=>{
    const box=await locator.boundingBox();expect(box).not.toBeNull();
    expect(box.x).toBeGreaterThanOrEqual(-1);expect(box.x+box.width).toBeLessThanOrEqual(width+1);
    return box;
  };
  try{
    for(const [width,height] of [[320,568],[375,667],[390,664],[430,932],[844,390],[768,1024],[900,800],[1280,800]]){
      await page.setViewportSize({width,height});
      await visit('/assistant');
      const input=page.getByRole('textbox',{name:"Message à envoyer à l'assistant"});
      const composer=page.locator('.kitchen-assistant-composer');
      expect((await inside(input,width)).width).toBeGreaterThan(width<900?width*.7:400);
      for(const control of await composer.locator('button').all()){
        const box=await inside(control,width);expect(box.width).toBeGreaterThanOrEqual(44);expect(box.height).toBeGreaterThanOrEqual(44);
      }
      const bottom=width<900?(await page.locator('.kitchen-bottom-nav').boundingBox()).y:height;
      const box=await composer.boundingBox();expect(box.y+box.height).toBeLessThanOrEqual(bottom+1);
      expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
      if(width===390)await page.screenshot({path:`${output}/${engine.name()}-assistant.png`});
      await visit('/kitchen/recipes');
      const search=page.getByRole('searchbox');
      await search.scrollIntoViewIfNeeded();
      const searchBox=await inside(search,width);
      expect(searchBox.width).toBeGreaterThan(width<900?width*.8:200);
      const cuisine=page.getByRole('combobox',{name:'Type de cuisine'});
      const cuisineBox=await inside(cuisine,width);expect(cuisineBox.height).toBeGreaterThanOrEqual(44);
      for(const tab of await page.getByRole('tab').all())await inside(tab,width);
      await search.fill('introuvable');
      await page.getByRole('button',{name:'Retirer les filtres et la recherche'}).click();
      await expect(page.getByRole('heading',{name:'Couscous de légumes rôtis'})).toBeVisible();
      await cuisine.selectOption({label:'Française'});
      await expect(cuisine).toHaveValue('francaise');
      await cuisine.selectOption('');
      await page.getByRole('tab',{name:'Découvrir',exact:true}).click();
      await expect(page.getByRole('tab',{name:'Découvrir',exact:true})).toHaveAttribute('data-state','active');
      await page.getByRole('tab',{name:'Bibliothèque',exact:true}).click();
      expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
      if(width===390){await search.scrollIntoViewIfNeeded();await page.screenshot({path:`${output}/${engine.name()}-recipes.png`});}
      console.log(`PASS ${engine.name()} ${width}x${height}: assistant, saisie, recherche, cuisine et onglets`);
    }
    await page.setViewportSize({width:390,height:844});
    await visit('/assistant?conversation=90000000-0000-4000-8000-000000000001');
    await expect(page.getByRole('log')).toContainText('La soupe est enregistrée');
    const input=page.getByRole('textbox',{name:"Message à envoyer à l'assistant"});
    await input.fill('Une idée de soupe avec mes légumes ?');
    await page.evaluate(()=>window.setTestVisibleHeight(390));
    await expect(page.locator('.kitchen-assistant-page')).toHaveAttribute('data-compact','true');
    const inputBox=await input.boundingBox(),send=await page.getByRole('button',{name:'Envoyer',exact:true}).boundingBox();
    expect(inputBox.width).toBeGreaterThan(300);expect(send.y+send.height).toBeLessThanOrEqual(390);
    await input.fill('Un message assez long pour vérifier que la saisie reste accessible. '.repeat(12));
    expect((await input.boundingBox()).height).toBeLessThanOrEqual(80);
    const card=await page.getByTestId('assistant-surface').boundingBox();
    const sendLong=await page.getByRole('button',{name:'Envoyer',exact:true}).boundingBox();
    expect(sendLong.y+sendLong.height).toBeLessThanOrEqual(Math.min(390,card.y+card.height));
    await page.screenshot({path:`${output}/${engine.name()}-keyboard.png`});
    await page.evaluate(()=>window.setTestVisibleHeight(undefined));
    await page.getByRole('button',{name:'Conversations',exact:true}).click();
    await expect(page.getByRole('dialog',{name:'Retrouver une conversation'})).toBeVisible();
    await page.getByRole('button',{name:'Fermer',exact:true}).click();
    await page.getByRole('button',{name:'Nouvelle conversation',exact:true}).click();
    await expect(page.getByRole('heading',{name:'Un coup de main en cuisine ?'})).toBeVisible();
    expect(errors).toEqual([]);
    console.log(`PASS ${engine.name()}: conversation, clavier simulé, saisie longue et historique`);
  }catch(error){await page.screenshot({path:`${output}/${engine.name()}-failure.png`});throw error;}
  finally{await browser.close();}
}

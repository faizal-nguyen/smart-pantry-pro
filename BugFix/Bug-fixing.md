Bug-fixing.md

erreure au build sur vercel 
Using TypeScript 5.9.2 (local user-provided)
api/ocr-recipe.ts(155,7): error TS2322: Type '"6"' is not assignable to type 'PSM'.
api/ocr-recipe.ts(182,60): error TS1517: Range out of order in character class.
Using TypeScript 5.9.2 (local user-provided)
api/ocr-vision.ts(209,7): error TS2322: Type 'number' is not assignable to type 'PSM'.
Using TypeScript 5.9.2 (local user-provided)
Using TypeScript 5.9.2 (local user-provided)
Using TypeScript 5.9.2 (local user-provided)
Using TypeScript 5.9.2 (local user-provided)
api/parse-social.ts(239,22): error TS2339: Property 'title' does not exist on type '{}'.
Build Completed in /vercel/output [37s]
Deploying outputs...

ajoute recette manuel : KO
ui-vendor-DC6_WijD.js:1 Warning: Missing `Description` or `aria-describedby={undefined}` for {DialogContent}.

index-Bx3RTlVL.js:33 🍳 Adding recipe: 
{name: 'fdsfsd', description: 'fdsfds', image_url: undefined, cuisine_category: undefined, meal_type: undefined, …}
supabase-vendor-CbgWI24E.js:1 
 POST https://jwoxacnflphclslpqfzs.supabase.co/rest/v1/recipe_ingredients?columns…2%2C%22is_essential%22%2C%22notes%22%2C%22recipe_id%22%2C%22order_index%22 400 (Bad Request)
(anonyme)	@	supabase-vendor-CbgWI24E.js:1
(anonyme)	@	supabase-vendor-CbgWI24E.js:1
o	@	supabase-vendor-CbgWI24E.js:1
Promise.then		
c	@	supabase-vendor-CbgWI24E.js:1
(anonyme)	@	supabase-vendor-CbgWI24E.js:1
Qt	@	supabase-vendor-CbgWI24E.js:1
(anonyme)	@	supabase-vendor-CbgWI24E.js:1
then	@	supabase-vendor-CbgWI24E.js:1
index-Bx3RTlVL.js:33 Error adding recipe with ingredients: 
{code: 'PGRST204', details: null, hint: null, message: "Could not find the 'name' column of 'recipe_ingredients' in the schema cache"}
u	@	index-Bx3RTlVL.js:33
await in u		
onRecipeAdded	@	index-Bx3RTlVL.js:33
onClick	@	index-Bx3RTlVL.js:33
_n	@	react-vendor-CrvtNH9J.js:20
Mn	@	react-vendor-CrvtNH9J.js:20
(anonyme)	@	react-vendor-CrvtNH9J.js:20
Pl	@	react-vendor-CrvtNH9J.js:20
Nl	@	react-vendor-CrvtNH9J.js:20
(anonyme)	@	react-vendor-CrvtNH9J.js:20
Js	@	react-vendor-CrvtNH9J.js:20
Sn	@	react-vendor-CrvtNH9J.js:20
Ol	@	react-vendor-CrvtNH9J.js:20
Ut	@	react-vendor-CrvtNH9J.js:20
Dt	@	react-vendor-CrvtNH9J.js:20

parsing url : KO 
Auth event: SIGNED_IN faizal.nguyen@hotmail.fr
index-Bx3RTlVL.js:33 🥘 Parsing Marmiton recipe: https://www.marmiton.org/recettes/recette_poireaux-a-la-grecque-rapides_29482.aspx
index-Bx3RTlVL.js:33  POST https://smart-pantry-pro.vercel.app/api/parse-recipe 500 (Internal Server Error)
Il @ index-Bx3RTlVL.js:33
parseRecipeFromURL @ index-Bx3RTlVL.js:33
onClick @ index-Bx3RTlVL.js:33
_n @ react-vendor-CrvtNH9J.js:20
Mn @ react-vendor-CrvtNH9J.js:20
(anonyme) @ react-vendor-CrvtNH9J.js:20
Pl @ react-vendor-CrvtNH9J.js:20
Nl @ react-vendor-CrvtNH9J.js:20
(anonyme) @ react-vendor-CrvtNH9J.js:20
Js @ react-vendor-CrvtNH9J.js:20
Sn @ react-vendor-CrvtNH9J.js:20
Ol @ react-vendor-CrvtNH9J.js:20
Ut @ react-vendor-CrvtNH9J.js:20
Dt @ react-vendor-CrvtNH9J.js:20Comprendre cette erreur
index-Bx3RTlVL.js:33 Parse recipe API error: A server error has occurred

FUNCTION_INVOCATION_FAILED

cdg1::bbbfd-1754300426643-d067c5e12143

Il @ index-Bx3RTlVL.js:33
await in Il
parseRecipeFromURL @ index-Bx3RTlVL.js:33
onClick @ index-Bx3RTlVL.js:33
_n @ react-vendor-CrvtNH9J.js:20
Mn @ react-vendor-CrvtNH9J.js:20
(anonyme) @ react-vendor-CrvtNH9J.js:20
Pl @ react-vendor-CrvtNH9J.js:20
Nl @ react-vendor-CrvtNH9J.js:20
(anonyme) @ react-vendor-CrvtNH9J.js:20
Js @ react-vendor-CrvtNH9J.js:20
Sn @ react-vendor-CrvtNH9J.js:20
Ol @ react-vendor-CrvtNH9J.js:20
Ut @ react-vendor-CrvtNH9J.js:20
Dt @ react-vendor-CrvtNH9J.js:20Comprendre cette erreur
index-Bx3RTlVL.js:33 Error parsing Marmiton recipe: Error: HTTP 500: 
    at Il (index-Bx3RTlVL.js:33:466687)
    at async parseRecipeFromURL (index-Bx3RTlVL.js:33:466045)
    at async onClick (index-Bx3RTlVL.js:33:514753)
Il @ index-Bx3RTlVL.js:33
await in Il
parseRecipeFromURL @ index-Bx3RTlVL.js:33
onClick @ index-Bx3RTlVL.js:33
_n @ react-vendor-CrvtNH9J.js:20
Mn @ react-vendor-CrvtNH9J.js:20
(anonyme) @ react-vendor-CrvtNH9J.js:20
Pl @ react-vendor-CrvtNH9J.js:20
Nl @ react-vendor-CrvtNH9J.js:20
(anonyme) @ react-vendor-CrvtNH9J.js:20
Js @ react-vendor-CrvtNH9J.js:20
Sn @ react-vendor-CrvtNH9J.js:20
Ol @ react-vendor-CrvtNH9J.js:20
Ut @ react-vendor-CrvtNH9J.js:20
Dt @ react-vendor-CrvtNH9J.js:20Comprendre cette erreur
index-Bx3RTlVL.js:33 🤖 Parsing with AI: https://www.marmiton.org/recettes/recette_poireaux-a-la-grecque-rapides_29482.aspx
index-Bx3RTlVL.js:33  POST https://smart-pantry-pro.vercel.app/api/parse-recipe-ai 500 (Internal Server Error)
Tl @ index-Bx3RTlVL.js:33
Il @ index-Bx3RTlVL.js:33
await in Il
parseRecipeFromURL @ index-Bx3RTlVL.js:33
onClick @ index-Bx3RTlVL.js:33
_n @ react-vendor-CrvtNH9J.js:20
Mn @ react-vendor-CrvtNH9J.js:20
(anonyme) @ react-vendor-CrvtNH9J.js:20
Pl @ react-vendor-CrvtNH9J.js:20
Nl @ react-vendor-CrvtNH9J.js:20
(anonyme) @ react-vendor-CrvtNH9J.js:20
Js @ react-vendor-CrvtNH9J.js:20
Sn @ react-vendor-CrvtNH9J.js:20
Ol @ react-vendor-CrvtNH9J.js:20
Ut @ react-vendor-CrvtNH9J.js:20
Dt @ react-vendor-CrvtNH9J.js:20Comprendre cette erreur
index-Bx3RTlVL.js:33 AI parsing failed: Error: AI parsing failed
    at Tl (index-Bx3RTlVL.js:33:468504)
    at async Il (index-Bx3RTlVL.js:33:467058)
    at async parseRecipeFromURL (index-Bx3RTlVL.js:33:466045)
    at async onClick (index-Bx3RTlVL.js:33:514753)
Tl @ index-Bx3RTlVL.js:33
await in Tl
Il @ index-Bx3RTlVL.js:33
await in Il
parseRecipeFromURL @ index-Bx3RTlVL.js:33
onClick @ index-Bx3RTlVL.js:33
_n @ react-vendor-CrvtNH9J.js:20
Mn @ react-vendor-CrvtNH9J.js:20
(anonyme) @ react-vendor-CrvtNH9J.js:20
Pl @ react-vendor-CrvtNH9J.js:20
Nl @ react-vendor-CrvtNH9J.js:20
(anonyme) @ react-vendor-CrvtNH9J.js:20
Js @ react-vendor-CrvtNH9J.js:20
Sn @ react-vendor-CrvtNH9J.js:20
Ol @ react-vendor-CrvtNH9J.js:20
Ut @ react-vendor-CrvtNH9J.js:20
Dt @ react-vendor-CrvtNH9J.js:20Comprendre cette erreur
index-Bx3RTlVL.js:33 URL parsing error: Error: Parsing IA impossible
    at onClick (index-Bx3RTlVL.js:33:514793)

    Parsing instagram : KO 
    Auth event: SIGNED_IN faizal.nguyen@hotmail.fr
index-Bx3RTlVL.js:33 📸 Parsing Instagram recipe: https://www.instagram.com/reel/DI9GJG8sHNu/?utm_source=ig_web_copy_link&igsh=MzRlODBiNWFlZA==
index-Bx3RTlVL.js:33  POST https://smart-pantry-pro.vercel.app/api/parse-social 500 (Internal Server Error)
$l @ index-Bx3RTlVL.js:33
parseRecipeFromSocial @ index-Bx3RTlVL.js:33
onClick @ index-Bx3RTlVL.js:33
_n @ react-vendor-CrvtNH9J.js:20
Mn @ react-vendor-CrvtNH9J.js:20
(anonyme) @ react-vendor-CrvtNH9J.js:20
Pl @ react-vendor-CrvtNH9J.js:20
Nl @ react-vendor-CrvtNH9J.js:20
(anonyme) @ react-vendor-CrvtNH9J.js:20
Js @ react-vendor-CrvtNH9J.js:20
Sn @ react-vendor-CrvtNH9J.js:20
Ol @ react-vendor-CrvtNH9J.js:20
Ut @ react-vendor-CrvtNH9J.js:20
Dt @ react-vendor-CrvtNH9J.js:20Comprendre cette erreur
index-Bx3RTlVL.js:33 Error parsing Instagram recipe: Error: HTTP 500: 
    at $l (index-Bx3RTlVL.js:33:478898)
    at async parseRecipeFromSocial (index-Bx3RTlVL.js:33:508258)
    at async onClick (index-Bx3RTlVL.js:33:517079)
$l @ index-Bx3RTlVL.js:33
await in $l
parseRecipeFromSocial @ index-Bx3RTlVL.js:33
onClick @ index-Bx3RTlVL.js:33
_n @ react-vendor-CrvtNH9J.js:20
Mn @ react-vendor-CrvtNH9J.js:20
(anonyme) @ react-vendor-CrvtNH9J.js:20
Pl @ react-vendor-CrvtNH9J.js:20
Nl @ react-vendor-CrvtNH9J.js:20
(anonyme) @ react-vendor-CrvtNH9J.js:20
Js @ react-vendor-CrvtNH9J.js:20
Sn @ react-vendor-CrvtNH9J.js:20
Ol @ react-vendor-CrvtNH9J.js:20
Ut @ react-vendor-CrvtNH9J.js:20
Dt @ react-vendor-CrvtNH9J.js:20Comprendre cette erreur
index-Bx3RTlVL.js:33 🤖 Parsing social media with AI: https://www.instagram.com/reel/DI9GJG8sHNu/?utm_source=ig_web_copy_link&igsh=MzRlODBiNWFlZA==
index-Bx3RTlVL.js:33  POST https://smart-pantry-pro.vercel.app/api/parse-social-ai 500 (Internal Server Error)
rd @ index-Bx3RTlVL.js:33
$l @ index-Bx3RTlVL.js:33
await in $l
parseRecipeFromSocial @ index-Bx3RTlVL.js:33
onClick @ index-Bx3RTlVL.js:33
_n @ react-vendor-CrvtNH9J.js:20
Mn @ react-vendor-CrvtNH9J.js:20
(anonyme) @ react-vendor-CrvtNH9J.js:20
Pl @ react-vendor-CrvtNH9J.js:20
Nl @ react-vendor-CrvtNH9J.js:20
(anonyme) @ react-vendor-CrvtNH9J.js:20
Js @ react-vendor-CrvtNH9J.js:20
Sn @ react-vendor-CrvtNH9J.js:20
Ol @ react-vendor-CrvtNH9J.js:20
Ut @ react-vendor-CrvtNH9J.js:20
Dt @ react-vendor-CrvtNH9J.js:20Comprendre cette erreur
index-Bx3RTlVL.js:33 Social AI parsing failed: Error: AI parsing failed
    at rd (index-Bx3RTlVL.js:33:482275)
    at async $l (index-Bx3RTlVL.js:33:479250)
    at async parseRecipeFromSocial (index-Bx3RTlVL.js:33:508258)
    at async onClick (index-Bx3RTlVL.js:33:517079)
rd @ index-Bx3RTlVL.js:33
await in rd
$l @ index-Bx3RTlVL.js:33
await in $l
parseRecipeFromSocial @ index-Bx3RTlVL.js:33
onClick @ index-Bx3RTlVL.js:33
_n @ react-vendor-CrvtNH9J.js:20
Mn @ react-vendor-CrvtNH9J.js:20
(anonyme) @ react-vendor-CrvtNH9J.js:20
Pl @ react-vendor-CrvtNH9J.js:20
Nl @ react-vendor-CrvtNH9J.js:20
(anonyme) @ react-vendor-CrvtNH9J.js:20
Js @ react-vendor-CrvtNH9J.js:20
Sn @ react-vendor-CrvtNH9J.js:20
Ol @ react-vendor-CrvtNH9J.js:20
Ut @ react-vendor-CrvtNH9J.js:20
Dt @ react-vendor-CrvtNH9J.js:20Comprendre cette erreur
index-Bx3RTlVL.js:33 Social parsing error: Error: Parsing réseaux sociaux impossible
    at onClick (index-Bx3RTlVL.js:33:517119)
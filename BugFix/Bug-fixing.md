Bug-fixing.md

Ajout de recette manuelle : KO 
smart-pantry-pro.vercel.app/:1 <meta name="apple-mobile-web-app-capable" content="yes"> is deprecated. Please include <meta name="mobile-web-app-capable" content="yes">

smart-pantry-pro.vercel.app/:1 Error while trying to use the following icon from the Manifest: https://smart-pantry-pro.vercel.app/icons/icon-144x144.png (Download error or resource isn't a valid image)
ui-vendor-DC6_WijD.js:1 Warning: Missing `Description` or `aria-describedby={undefined}` for {DialogContent}.
index-4KiY0Ft9.js:33 🍳 Adding recipe: 
{name: 'byriani', description: undefined, image_url: undefined, cuisine_category: undefined, meal_type: undefined, …}
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
index-4KiY0Ft9.js:33 Error adding recipe with ingredients: 
{code: 'PGRST204', details: null, hint: null, message: "Could not find the 'is_essential' column of 'recipe_ingredients' in the schema cache"}
u	@	index-4KiY0Ft9.js:33
await in u		
onRecipeAdded	@	index-4KiY0Ft9.js:33
onClick	@	index-4KiY0Ft9.js:33
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

Ajouter une recette en parsant une URL : KO 
🤖 Parsing with AI: https://www.marmiton.org/recettes/recette_poireaux-a-la-grecque-rapides_29482.aspx
index-4KiY0Ft9.js:33  POST https://smart-pantry-pro.vercel.app/api/parse-recipe-ai 500 (Internal Server Error)
Tl @ index-4KiY0Ft9.js:33
Il @ index-4KiY0Ft9.js:33
await in Il
parseRecipeFromURL @ index-4KiY0Ft9.js:33
onClick @ index-4KiY0Ft9.js:33
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
index-4KiY0Ft9.js:33 AI parsing failed: Error: AI parsing failed
    at Tl (index-4KiY0Ft9.js:33:468358)
    at async Il (index-4KiY0Ft9.js:33:466912)
    at async parseRecipeFromURL (index-4KiY0Ft9.js:33:465899)
    at async onClick (index-4KiY0Ft9.js:33:514600)
Tl @ index-4KiY0Ft9.js:33
await in Tl
Il @ index-4KiY0Ft9.js:33
await in Il
parseRecipeFromURL @ index-4KiY0Ft9.js:33
onClick @ index-4KiY0Ft9.js:33
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
index-4KiY0Ft9.js:33 URL parsing error: Error: Parsing IA impossible
    at onClick (index-4KiY0Ft9.js:33:514640)

    Parsing recette sur Instagram : KO 
    🤖 Parsing social media with AI: https://www.instagram.com/reel/DI9GJG8sHNu/?utm_source=ig_web_copy_link&igsh=MzRlODBiNWFlZA==
index-4KiY0Ft9.js:33  POST https://smart-pantry-pro.vercel.app/api/parse-social-ai 500 (Internal Server Error)
rd @ index-4KiY0Ft9.js:33
$l @ index-4KiY0Ft9.js:33
parseRecipeFromSocial @ index-4KiY0Ft9.js:33
onClick @ index-4KiY0Ft9.js:33
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
index-4KiY0Ft9.js:33 Social AI parsing failed: Error: AI parsing failed
    at rd (index-4KiY0Ft9.js:33:482122)
    at async $l (index-4KiY0Ft9.js:33:479097)
    at async parseRecipeFromSocial (index-4KiY0Ft9.js:33:508105)
    at async onClick (index-4KiY0Ft9.js:33:516926)
rd @ index-4KiY0Ft9.js:33
await in rd
$l @ index-4KiY0Ft9.js:33
parseRecipeFromSocial @ index-4KiY0Ft9.js:33
onClick @ index-4KiY0Ft9.js:33
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
index-4KiY0Ft9.js:33 Social parsing error: Error: Parsing réseaux sociaux impossible
    at onClick (index-4KiY0Ft9.js:33:516966)
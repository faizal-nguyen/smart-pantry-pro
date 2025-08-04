Bug-fixing.md

Lorsque j'ajoute une URL de marmitton, il se passe toujours rien 
Voici les logs : smart-pantry-pro.vercel.app/:1 <meta name="apple-mobile-web-app-capable" content="yes"> is deprecated. Please include <meta name="mobile-web-app-capable" content="yes">Comprendre cet avertissement
index-4KiY0Ft9.js:33 Auth event: INITIAL_SESSION faizal.nguyen@hotmail.fr
smart-pantry-pro.vercel.app/:1 Error while trying to use the following icon from the Manifest: https://smart-pantry-pro.vercel.app/icons/icon-144x144.png (Download error or resource isn't a valid image)Comprendre cette erreur
supabase-vendor-CbgWI24E.js:1  GET https://jwoxacnflphclslpqfzs.supabase.co/rest/v1/recipe_collections?select=*&user_id=eq.c1e994cc-4af9-47ef-9fd1-a8a8f803c5c6&order=created_at.desc 404 (Not Found)
(anonyme) @ supabase-vendor-CbgWI24E.js:1
(anonyme) @ supabase-vendor-CbgWI24E.js:1
o @ supabase-vendor-CbgWI24E.js:1
Promise.then
c @ supabase-vendor-CbgWI24E.js:1
(anonyme) @ supabase-vendor-CbgWI24E.js:1
Qt @ supabase-vendor-CbgWI24E.js:1
(anonyme) @ supabase-vendor-CbgWI24E.js:1
then @ supabase-vendor-CbgWI24E.js:1Comprendre cette erreur
index-4KiY0Ft9.js:33 Error fetching collections: {code: '42P01', details: null, hint: null, message: 'relation "public.recipe_collections" does not exist'}
c @ index-4KiY0Ft9.js:33
await in c
(anonyme) @ index-4KiY0Ft9.js:33
(anonyme) @ index-4KiY0Ft9.js:33
qi @ react-vendor-CrvtNH9J.js:20
dc @ react-vendor-CrvtNH9J.js:20
(anonyme) @ react-vendor-CrvtNH9J.js:20
fc @ react-vendor-CrvtNH9J.js:20
Zs @ react-vendor-CrvtNH9J.js:20
Ma @ react-vendor-CrvtNH9J.js:20
(anonyme) @ react-vendor-CrvtNH9J.js:20Comprendre cette erreur
supabase-vendor-CbgWI24E.js:1  GET https://jwoxacnflphclslpqfzs.supabase.co/rest/v1/recipes?select=*&or=%28user_id.eq.c1e994cc-4af9-47ef-9fd1-a8a8f803c5c6%2Cis_public.eq.true%29&order=created_at.desc 400 (Bad Request)
(anonyme) @ supabase-vendor-CbgWI24E.js:1
(anonyme) @ supabase-vendor-CbgWI24E.js:1
o @ supabase-vendor-CbgWI24E.js:1
Promise.then
c @ supabase-vendor-CbgWI24E.js:1
(anonyme) @ supabase-vendor-CbgWI24E.js:1
Qt @ supabase-vendor-CbgWI24E.js:1
(anonyme) @ supabase-vendor-CbgWI24E.js:1
then @ supabase-vendor-CbgWI24E.js:1Comprendre cette erreur
index-4KiY0Ft9.js:33 Error fetching recipes: {code: '42703', details: null, hint: null, message: 'column recipes.is_public does not exist'}
a @ index-4KiY0Ft9.js:33
await in a
(anonyme) @ index-4KiY0Ft9.js:33
(anonyme) @ index-4KiY0Ft9.js:33
qi @ react-vendor-CrvtNH9J.js:20
dc @ react-vendor-CrvtNH9J.js:20
(anonyme) @ react-vendor-CrvtNH9J.js:20
fc @ react-vendor-CrvtNH9J.js:20
Zs @ react-vendor-CrvtNH9J.js:20
Ma @ react-vendor-CrvtNH9J.js:20
(anonyme) @ react-vendor-CrvtNH9J.js:20Comprendre cette erreur
index-4KiY0Ft9.js:33 Auth event: SIGNED_IN faizal.nguyen@hotmail.fr
ui-vendor-DC6_WijD.js:1 Warning: Missing `Description` or `aria-describedby={undefined}` for {DialogContent}.

Erreur sur la partie parsin reseaux social, voici les logs 
index-4KiY0Ft9.js:33 Error parsing Instagram recipe: Error: Invalid Instagram URL
    at $l (index-4KiY0Ft9.js:33:478528)
    at parseRecipeFromSocial (index-4KiY0Ft9.js:33:508111)
    at onClick (index-4KiY0Ft9.js:33:516932)
    at Object._n (react-vendor-CrvtNH9J.js:20:16599)
    at Mn (react-vendor-CrvtNH9J.js:20:16753)
    at react-vendor-CrvtNH9J.js:20:36642
    at Pl (react-vendor-CrvtNH9J.js:20:36736)
    at Nl (react-vendor-CrvtNH9J.js:20:37149)
    at react-vendor-CrvtNH9J.js:20:42574
    at Js (react-vendor-CrvtNH9J.js:20:105709)
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
index-4KiY0Ft9.js:33 🤖 Parsing social media with AI: https://www.instagram.com/reel/DI9GJG8sHNu/?utm_source=ig_web_copy_link&igsh=MzRlODBiNWFlZA==
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

    Ajout d'une recette manuel -> KO, voici les logs 
    🍳 Adding recipe: {name: 'fdsfds', description: 'fdsfds', image_url: undefined, cuisine_category: undefined, meal_type: undefined, …}
supabase-vendor-CbgWI24E.js:1  POST https://jwoxacnflphclslpqfzs.supabase.co/rest/v1/recipes?columns=%22name%22%2C%22description%22%2C%22image_url%22%2C%22cuisine_category%22%2C%22meal_type%22%2C%22prep_time%22%2C%22cook_time%22%2C%22servings%22%2C%22difficulty%22%2C%22instructions%22%2C%22tags%22%2C%22user_id%22&select=* 400 (Bad Request)
(anonyme) @ supabase-vendor-CbgWI24E.js:1
(anonyme) @ supabase-vendor-CbgWI24E.js:1
o @ supabase-vendor-CbgWI24E.js:1
Promise.then
c @ supabase-vendor-CbgWI24E.js:1
(anonyme) @ supabase-vendor-CbgWI24E.js:1
Qt @ supabase-vendor-CbgWI24E.js:1
(anonyme) @ supabase-vendor-CbgWI24E.js:1
then @ supabase-vendor-CbgWI24E.js:1Comprendre cette erreur
index-4KiY0Ft9.js:33 Error adding recipe with ingredients: {code: 'PGRST204', details: null, hint: null, message: "Could not find the 'cook_time' column of 'recipes' in the schema cache"}


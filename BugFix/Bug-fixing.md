Bug-fixing.md

🤖 Parsing with AI: https://www.marmiton.org/recettes/recette_poireaux-a-la-grecque-rapides_29482.aspx
index-CiUanMF1.js:33  POST https://smart-pantry-pro.vercel.app/api/parse-recipe-ai 500 (Internal Server Error)
Tl @ index-CiUanMF1.js:33
Il @ index-CiUanMF1.js:33
await in Il
parseRecipeFromURL @ index-CiUanMF1.js:33
onClick @ index-CiUanMF1.js:33
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
index-CiUanMF1.js:33 AI parsing failed: Error: AI parsing failed
    at Tl (index-CiUanMF1.js:33:468504)
    at async Il (index-CiUanMF1.js:33:467058)
    at async parseRecipeFromURL (index-CiUanMF1.js:33:466045)
    at async onClick (index-CiUanMF1.js:33:514753)
Tl @ index-CiUanMF1.js:33
await in Tl
Il @ index-CiUanMF1.js:33
await in Il
parseRecipeFromURL @ index-CiUanMF1.js:33
onClick @ index-CiUanMF1.js:33
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
index-CiUanMF1.js:33 URL parsing error: Error: Parsing IA impossible
    at onClick (index-CiUanMF1.js:33:514793)

    2. Tester l'endpoint de diagnostic:
  curl https://votre-app.vercel.app/api/test-env
  -> https://smart-pantry-pro.vercel.app/api/test-env

  This Serverless Function has crashed.

Your connection is working correctly.

Vercel is working correctly.

500: INTERNAL_SERVER_ERROR
Code: FUNCTION_INVOCATION_FAILED
ID: cdg1::9mntz-1754314355267-0ea55b2fddda

If you are a visitor, contact the website owner or try again later.
If you are the owner, learn how to fix the error and check the logs.

je n'ai aucun log pour expliquer quel est le probleme precis, sur vercel j'ai bien ajouter la variable d'environnement. 
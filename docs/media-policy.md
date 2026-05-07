# Media Policy - Smart Pantry Pro

## Principe

Smart Pantry Pro garde les recettes et leurs sources de facon durable, sans telecharger automatiquement les videos Instagram/TikTok/YouTube.

Par defaut, un import social conserve :

- l'URL source;
- les metadata disponibles;
- l'embed officiel quand il existe;
- une cover/thumbnail autorisee ou ajoutee par l'utilisateur;
- la recette extraite/verifiee.

## Archive personnelle

L'utilisateur peut uploader une video personnelle pour une recette si la video a ete :

- creee par l'utilisateur;
- obtenue via un bouton officiel de la plateforme;
- sauvegardee comme backup personnel;
- fournie avec permission;
- couverte par une licence.

Chaque upload stocke une attestation versionnee avec :

- base de droits;
- version de policy;
- date d'attestation;
- source URL optionnelle.

## Ce Que L'app Ne Fait Pas

Smart Pantry Pro ne fournit pas de downloader Instagram/TikTok automatise, ne contourne pas les logins, CAPTCHA, DRM, restrictions de plateforme ou APIs privees.

## Stockage V1

- Provider: Supabase Storage.
- Bucket: `recipe-media`.
- Visibilite: privee.
- Acces playback: URL signee courte duree via API.
- Upload multipart V1: 50 MB max par fichier.

## Quotas V1

| Plan | Images | Videos | Taille fichier video |
|---|---:|---:|---:|
| Free | 250 MB | 5 min / 250 MB | 50 MB |
| Premium | 10 GB | 300 min / 10 GB | 500 MB via pipeline futur |


#!/usr/bin/env python3
"""Prepare the approved private recipe collection; never writes to a database.

Input: a locally parsed Ciqual 2020 reference (see data/nutrition/README.md).
All recipe amounts are net edible weights in grams. Procedures are house
adaptations, not transcriptions of a publisher's recipe. Missing nutrients stay
null; Ciqual quantification limits propagate as upper bounds.
"""
import argparse
import datetime
import json
import math
import unicodedata
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
FOODS = {
 "onion":("Oignons","20034"), "garlic":("Ail","11000"), "shallot":("Échalotes","20097"),
 "carrot":("Carottes","20009"), "leek":("Poireaux","20039"), "celery":("Céleri branche","20023"),
 "celeriac":("Céleri-rave","20055"), "mushroom":("Champignons de Paris","20056"),
 "morel":("Morilles fraîches","20105"), "potato":("Pommes de terre","4008"),
 "tomato":("Tomates","20047"), "tomato_pulp":("Pulpe de tomates","20169"),
 "tomato_paste":("Concentré de tomates","20068"), "spinach":("Épinards","20059"),
 "cauliflower":("Chou-fleur","20016"), "fennel":("Fenouil","20028"),
 "red_pepper":("Poivron rouge","20087"), "chilli":("Piment frais","20151"),
 "parsley":("Persil frais","11014"), "thyme":("Thym frais","11070"),
 "bay":("Laurier","11053"), "tarragon":("Estragon frais","11092"),
 "basil":("Basilic frais","11033"), "coriander":("Coriandre fraîche","11094"),
 "lemon":("Jus de citron","2007"), "olive_oil":("Huile d'olive","17270"),
 "butter":("Beurre","16400"), "cream":("Crème fraîche à 30 % MG","19410"),
 "light_cream":("Crème légère à 15–20 % MG","19436"), "milk":("Lait demi-écrémé","19041"),
 "yogurt":("Yaourt nature","19593"), "parmesan":("Parmesan","12120"),
 "emmental":("Emmental","12115"), "comte":("Comté","12110"),
 "rice":("Riz à risotto","9100"), "frik":("Frik cru","51510"),
 "flour":("Farine de blé","9436"), "bread":("Pain de campagne","7100"),
 "puff":("Pâte feuilletée pur beurre","23424"), "shortcrust":("Pâte brisée pur beurre","23414"),
 "breadcrumbs":("Chapelure","7500"), "egg":("Œufs sans coquille","22000"),
 "yolk":("Jaunes d'œufs","22002"), "white":("Blancs d'œufs","22001"),
 "sugar":("Sucre","31016"), "chocolate":("Chocolat noir à 70 %","31074"),
 "vanilla":("Gousse de vanille","11057"), "salt":("Sel","11017"),
 "pepper":("Poivre noir","11015"), "saffron":("Safran","11039"),
 "paprika":("Paprika","11049"), "cumin":("Graines de cumin","11042"),
 "harissa":("Harissa","11112"), "mustard":("Moutarde","11013"),
 "mayo":("Mayonnaise","11054"), "vinegar":("Vinaigre de cidre","11090"),
 "cornichon":("Cornichons","11004"), "lettuce":("Laitue romaine","20171"),
 "anchovy":("Filets d'anchois à l'huile égouttés","26000"), "apple":("Pommes, pulpe","13050"),
 "water":("Eau","18066"), "stock_chicken":("Bouillon de volaille reconstitué","25947"),
 "stock_beef":("Bouillon de bœuf reconstitué","25930"), "stock_veg":("Bouillon de légumes reconstitué","25948"),
 "veal_shoulder":("Épaule de veau désossée","6560"), "veal_fillet":("Filet de veau","6530"),
 "veal_escalope":("Escalopes de veau","6521"), "veal_rib":("Côte de veau, poids net de viande","6510"),
 "sweetbread":("Ris de veau","40304"), "beef_stew":("Paleron de bœuf","6270"),
 "beef_fillet":("Filet de bœuf","6116"), "beef_minced":("Bœuf haché à 5 % MG","6250"),
 "beef_roast":("Rumsteck de bœuf pour rôti","6206"), "beef_cooked":("Bœuf cuit, paleron","6271"),
 "lamb_leg":("Gigot d'agneau, poids net désossé","21502"),
 "lamb_rack":("Carré d'agneau, poids net de viande","21517"),
 "chicken":("Filets de poulet sans peau","36017"), "chicken_skin":("Poulet désossé avec peau","36016"),
 "sole":("Filets de sole","26058"), "dorade":("Filets de dorade royale","26088"),
 "bass":("Filets de bar","26072"), "peter":("Filets de Saint-Pierre","26104"),
 "turbot":("Filets de turbot","26174"), "coley":("Filets de lieu noir","26134"),
 "monkfish":("Queue de lotte sans arête","26208"), "mullet":("Filets de rouget","26085"),
 "salmon":("Filets de saumon","26036"), "cod":("Filets de cabillaud","26043"),
 "shrimp":("Crevettes cuites décortiquées","10007"), "scallop":("Noix de Saint-Jacques","10045"),
 "foie_gras":("Foie gras de canard nature cuit, sans alcool","8321"),
}
RECIPES = []

def r(selection_id, ingredients, steps, prep, cook, *, rest=0, servings=4, course="main",
      cuisine="Française", source=None, equipment=None, notes=None):
    RECIPES.append(dict(selection_id=selection_id, amounts=ingredients, instructions=steps,
      prep_time=prep, cook_time=cook, rest_time=rest, servings=servings, course=course,
      cuisine=cuisine, source_slug=source, required_equipment=equipment or ["plaque", "casserole"],
      assumptions=notes or []))

def cream_steps(protein, herb="persil", minutes=12, mushrooms=True):
    steps=[f"Éponger {protein}. Émincer les échalotes et préparer les autres ingrédients.",
      f"Chauffer le beurre dans une sauteuse. Dorer {protein} puis poursuivre doucement jusqu'à cuisson à cœur, environ {minutes} minutes selon l'épaisseur. Réserver au chaud.",
      "Dans la même sauteuse, faire suer les échalotes."]
    if mushrooms: steps.append("Ajouter les champignons émincés et cuire jusqu'à évaporation de leur eau.")
    return steps+["Verser l'eau prévue, décoller les sucs et réduire. Ajouter la crème et laisser épaissir quelques minutes à feu doux.",
      f"Remettre la viande dans la sauce, réchauffer sans la dessécher et terminer avec {herb}. Rectifier l'assaisonnement et partager en quatre portions."]

def fish_pan_steps(fish, side=None):
    steps=[f"Vérifier que {fish} ne contient plus d'arêtes. Éponger, assaisonner et préparer les légumes.",
      f"Chauffer une poêle avec la matière grasse. Cuire {fish} à feu modéré, côté peau d'abord s'il en a, puis retourner délicatement. Adapter la durée à l'épaisseur : la chair doit être cuite et se détacher facilement.",
      "Réserver le poisson au chaud. Ajouter le jus de citron et quelques cuillerées d'eau dans la poêle, décoller les sucs puis incorporer le beurre restant hors du feu."]
    if side: steps.append(side)
    return steps+["Répartir le poisson et son accompagnement dans quatre assiettes ; ajouter la sauce et le persil ciselé au dernier moment."]

r(1,[("onion",600),("butter",25),("flour",20),("stock_beef",500),("water",500),("bread",120),("emmental",80),("pepper",0.5)],
 ["Émincer finement les oignons. Les cuire au beurre à feu doux 25 à 30 minutes, en remuant, jusqu'à une coloration dorée sans les brûler.",
  "Saupoudrer de farine et mélanger deux minutes. Verser progressivement le bouillon et l'eau, puis laisser frémir 20 minutes.",
  "Goûter avant de saler : le bouillon et le fromage apportent déjà du sel. Poivrer.",
  "Griller le pain. Répartir la soupe dans quatre bols allant au four, ajouter le pain puis l'emmental.",
  "Faire gratiner sous le gril en surveillant et servir bien chaud."],15,55,course="starter",source="soupe-oignon",equipment=["plaque","casserole","four"])
r(7,[("rice",280),("mushroom",500),("onion",120),("stock_veg",600),("water",400),("olive_oil",20),("butter",20),("parmesan",60),("parsley",10),("pepper",0.5)],
 ["Faire dorer les champignons émincés avec la moitié de l'huile, puis réserver.",
  "Faire suer l'oignon avec le reste d'huile. Ajouter le riz et remuer deux minutes.",
  "Garder le bouillon et l'eau chauds. Les ajouter au riz par petites louches, en remuant ; attendre leur absorption entre deux ajouts.",
  "Après environ 18 à 20 minutes, vérifier la cuisson et ajouter les champignons.",
  "Hors du feu, incorporer le beurre, le parmesan et le persil. Laisser reposer deux minutes et servir immédiatement."],15,30,cuisine="Italienne",source="risotto-cepe",notes=["Le riz à risotto est représenté par la référence Ciqual « Riz blanc, cru »."])
r(10,[("tomato",700),("red_pepper",250),("onion",150),("garlic",12),("olive_oil",25),("egg",200),("tomato_paste",30),("harissa",15),("cumin",2),("paprika",2),("salt",1),("pepper",0.5)],
 ["Émincer l'oignon et le poivron, puis hacher l'ail. Couper les tomates.",
  "Faire suer l'oignon et le poivron dans l'huile dix minutes. Ajouter l'ail, le concentré, les épices et la harissa ; remuer une minute.",
  "Ajouter les tomates, assaisonner et laisser mijoter une vingtaine de minutes jusqu'à une sauce épaisse.",
  "Former quatre creux, répartir les œufs et couvrir. Cuire doucement jusqu'à ce que les blancs soient pris et les œufs cuits selon ton choix.",
  "Servir l'ojja chaude, en répartissant la sauce et les œufs entre quatre assiettes."],15,35,cuisine="Tunisienne",equipment=["plaque","sauteuse"])
r(11,[("chicken",400),("frik",100),("onion",150),("carrot",150),("celery",100),("tomato_pulp",400),("tomato_paste",30),("olive_oil",20),("water",1400),("coriander",15),("paprika",2),("salt",4),("pepper",0.5)],
 ["Rincer le frik. Couper le poulet en petits morceaux, puis émincer l'oignon, la carotte et le céleri.",
  "Faire revenir le poulet dans l'huile, puis ajouter les légumes. Incorporer le concentré et le paprika.",
  "Ajouter la pulpe de tomates et l'eau ; assaisonner. Laisser frémir 20 minutes.",
  "Ajouter le frik et poursuivre jusqu'à ce qu'il soit tendre, en suivant aussi son emballage ; remuer pour éviter qu'il attache et ajuster l'eau.",
  "Vérifier la cuisson du poulet, terminer avec la coriandre ciselée et répartir en quatre bols."],15,45,cuisine="Tunisienne")
r(17,[("chicken",600),("lettuce",400),("bread",120),("parmesan",60),("yogurt",150),("mustard",15),("lemon",30),("anchovy",20),("olive_oil",25),("garlic",5),("pepper",0.5)],
 ["Couper le pain en cubes, l'enrober d'une petite partie de l'huile et le faire dorer au four à 180 °C en surveillant.",
  "Cuire le poulet à la poêle avec le reste d'huile jusqu'à cuisson complète ; laisser reposer puis trancher.",
  "Mixer le yaourt, les anchois égouttés, l'ail, la moutarde et le citron ; poivrer.",
  "Laver et essorer la romaine. Mélanger avec la sauce au dernier moment.",
  "Répartir la salade, le poulet, les croûtons et le parmesan entre quatre assiettes."],20,20,cuisine="Américaine",source="salade-cesar",equipment=["plaque","poêle","four"],notes=["Variante maison de la César : sauce au yaourt. Les anchois et le parmesan apportent déjà du sel."])
r(21,[("veal_shoulder",800),("carrot",250),("leek",200),("onion",150),("mushroom",300),("water",1000),("butter",35),("flour",35),("light_cream",150),("lemon",20),("thyme",2),("salt",3),("pepper",0.5)],
 ["Couper le veau en gros cubes. Le couvrir d'eau froide, porter à frémissement et écumer.",
  "Ajouter carottes, poireaux, oignon et thym. Cuire doucement environ 75 à 90 minutes, jusqu'à une viande tendre ; garder le liquide de cuisson.",
  "Cuire les champignons émincés avec une petite partie du beurre.",
  "Faire un roux avec le reste du beurre et la farine ; verser progressivement du liquide de cuisson filtré pour obtenir une sauce nappante.",
  "Ajouter la crème, la viande et les champignons. Réchauffer doucement, terminer avec le citron et rectifier l'assaisonnement."],25,100,source="blanquette-veau")
r(22,[("beef_stew",800),("carrot",300),("onion",250),("mushroom",300),("tomato_paste",30),("water",800),("olive_oil",20),("flour",25),("garlic",12),("thyme",2),("vinegar",15),("salt",3),("pepper",0.5)],
 ["Couper le paleron en cubes et bien l'éponger. Préparer les légumes.",
  "Dorer la viande dans l'huile en plusieurs fois. Ajouter les oignons et les carottes ; saupoudrer de farine et mélanger.",
  "Ajouter le concentré, l'ail, le thym, l'eau et le vinaigre de cidre. Assaisonner, couvrir et mijoter doucement environ 2 h 30 à 3 heures, jusqu'à tendreté.",
  "Dorer les champignons séparément puis les ajouter pour les 20 dernières minutes.",
  "Découvrir pour réduire la sauce si nécessaire. Répartir en quatre portions."],25,180,source="boeuf-bourguignon",notes=["Adaptation sans vin et sans lardons : eau, légumes, sucs de viande et vinaigre de cidre constituent la sauce."])
r(24,[("beef_stew",800),("carrot",800),("onion",200),("garlic",10),("tomato_paste",20),("olive_oil",20),("water",700),("thyme",2),("salt",3),("pepper",0.5)],
 ["Dorer le bœuf coupé en cubes dans l'huile. Faire revenir les oignons dans la cocotte.",
  "Ajouter l'ail, le concentré, le thym et l'eau. Assaisonner et laisser mijoter à couvert environ deux heures.",
  "Ajouter les carottes en gros tronçons et poursuivre 40 à 50 minutes, jusqu'à tendreté de la viande et des légumes.",
  "Réduire le jus à découvert si nécessaire et servir en quatre portions."],20,170,source="boeuf-carottes")
r(25,[("beef_minced",600),("potato",900),("onion",180),("carrot",180),("milk",200),("butter",35),("emmental",60),("olive_oil",15),("tomato_paste",20),("water",150),("salt",3),("pepper",0.5)],
 ["Cuire les pommes de terre en morceaux dans l'eau, puis bien les égoutter. Les écraser avec le lait chaud et une partie du beurre.",
  "Faire suer l'oignon et la carotte finement coupés dans l'huile. Ajouter le bœuf haché et le cuire en l'émiettant.",
  "Incorporer le concentré et l'eau ; laisser mijoter quelques minutes. Assaisonner la viande et la purée.",
  "Mettre la viande dans un plat, couvrir de purée, ajouter l'emmental et le beurre restant.",
  "Gratiner au four à 200 °C pendant environ 20 minutes."],25,45,source="hachis-parmentier",equipment=["plaque","casserole","four"])
r(28,[("potato",1000),("milk",350),("cream",250),("garlic",8),("butter",15),("salt",3),("pepper",0.5)],
 ["Préchauffer le four à 160 °C. Éplucher les pommes de terre et les couper en fines rondelles régulières ; ne pas les rincer après découpe.",
  "Chauffer le lait et la crème avec l'ail haché, le sel et le poivre. Ajouter les pommes de terre et précuire doucement dix minutes sans les écraser.",
  "Beurrer un plat, y verser les pommes de terre et leur liquide.",
  "Cuire au four environ une heure, jusqu'à ce que les pommes de terre soient fondantes et la surface dorée.",
  "Laisser reposer dix minutes avant de partager. Ce gratin est un accompagnement."],20,70,rest=10,source="gratin-dauphinois",equipment=["plaque","casserole","four"])
r(39,[("chicken_skin",800),("potato",800),("onion",200),("garlic",15),("olive_oil",25),("thyme",3),("water",150),("salt",3),("pepper",0.5)],
 ["Préchauffer le four à 190 °C. Couper les pommes de terre en morceaux et les oignons en quartiers.",
  "Utiliser des morceaux de poulet désossés avec peau, les éponger et les assaisonner. Mettre les légumes dans un plat avec l'huile, l'ail, le thym et l'eau.",
  "Poser le poulet peau vers le haut. Rôtir environ 40 à 50 minutes en arrosant, jusqu'à cuisson complète.",
  "Laisser reposer le poulet quelques minutes et servir avec les pommes de terre et le jus."],20,50,equipment=["four"],notes=["Version en morceaux désossés ; les 800 g désignent la viande et la peau comestibles, pas un poulet entier avec ses os."])
r(41,[("veal_shoulder",800),("onion",180),("carrot",200),("mushroom",300),("tomato_pulp",400),("tomato_paste",25),("olive_oil",20),("garlic",12),("water",500),("thyme",2),("salt",3),("pepper",0.5)],
 ["Dorer les cubes de veau dans l'huile. Ajouter l'oignon et la carotte, puis faire suer quelques minutes.",
  "Incorporer l'ail, le concentré et la pulpe de tomates. Ajouter l'eau et le thym ; assaisonner.",
  "Couvrir et mijoter doucement environ 75 à 90 minutes, jusqu'à une viande tendre.",
  "Dorer les champignons séparément et les ajouter pendant les vingt dernières minutes. Réduire la sauce au besoin."],25,100,source="poulet-marengo",notes=["Version maison au veau, sans vin ; la référence liée illustre la technique Marengo au poulet."])
r(44,[("veal_escalope",600),("mushroom",500),("shallot",100),("light_cream",180),("butter",25),("water",150),("parsley",10),("salt",2),("pepper",0.5)],cream_steps("les escalopes de veau",minutes=6),15,20)
r(45,[("sole",700),("flour",25),("butter",60),("lemon",50),("parsley",12),("salt",2),("pepper",0.5)],
 ["Éponger les filets de sole, assaisonner puis les fariner légèrement. Secouer l'excédent ; la quantité indiquée correspond à la farine retenue pour cette version.",
  "Chauffer une partie du beurre dans une grande poêle. Cuire les filets sans les superposer, puis les retourner délicatement ; vérifier la cuisson de la chair.",
  "Réserver au chaud. Faire blondir le beurre restant, ajouter le citron hors du feu puis le persil.",
  "Napper les filets et servir immédiatement, en quatre portions."],15,12,source="sole-meuniere",equipment=["plaque","poêle"])
r(50,[("cod",700),("potato",850),("leek",300),("milk",250),("butter",30),("emmental",60),("olive_oil",15),("lemon",25),("salt",2),("pepper",0.5)],
 ["Cuire les pommes de terre et les écraser avec le lait chaud et une partie du beurre.",
  "Faire fondre les poireaux émincés dans l'huile avec un fond d'eau.",
  "Cuire le cabillaud à la vapeur ou dans une poêle couverte, puis l'effeuiller en retirant les arêtes. Mélanger aux poireaux et au citron.",
  "Disposer ce mélange dans un plat, couvrir de purée puis d'emmental et du beurre restant.",
  "Gratiner au four à 200 °C pendant environ vingt minutes."],25,45,equipment=["plaque","casserole","four"])
r(51,[("dorade",700),("potato",800),("tomato",400),("onion",200),("olive_oil",30),("garlic",10),("lemon",35),("thyme",2),("water",200),("salt",2),("pepper",0.5)],
 ["Préchauffer le four à 180 °C. Couper les pommes de terre en fines rondelles, émincer l'oignon et couper les tomates.",
  "Disposer les légumes dans un plat avec l'huile, l'ail, le thym et l'eau. Cuire environ 35 minutes en surveillant.",
  "Ajouter les filets de dorade, assaisonner et arroser de citron. Poursuivre 15 à 20 minutes selon l'épaisseur, jusqu'à cuisson du poisson.",
  "Répartir les filets et les légumes en quatre assiettes."],20,55,source="dorade-espagnole",equipment=["four"],notes=["Version maison en filets : les poids de poisson sont nets d'arêtes."])
r(52,[("monkfish",350),("cod",350),("mullet",250),("potato",500),("tomato",500),("fennel",250),("onion",200),("garlic",20),("olive_oil",30),("water",1400),("saffron",0.2),("parsley",10),("salt",4),("pepper",0.5)],
 ["Émincer l'oignon et le fenouil. Les faire suer dans l'huile, puis ajouter l'ail et les tomates coupées.",
  "Verser l'eau, ajouter le safran et les pommes de terre en tranches. Assaisonner et laisser frémir vingt minutes.",
  "Vérifier que tous les poissons sont désarêtés. Ajouter d'abord la lotte, puis le cabillaud et le rouget selon leur épaisseur.",
  "Cuire doucement, sans remuer brutalement, jusqu'à ce que les poissons soient cuits. Ajouter le persil et servir bouillon, pommes de terre et poissons.",
  "Cette version maison simplifiée est préparée sans alcool, avec les espèces indiquées."],30,40)
r(57,[("shortcrust",250),("salmon",350),("spinach",500),("egg",200),("milk",150),("light_cream",150),("emmental",60),("olive_oil",10),("salt",2),("pepper",0.5)],
 ["Préchauffer le four à 180 °C. Foncer un moule avec la pâte et la précuire dix minutes.",
  "Faire tomber les épinards dans l'huile, puis bien les égoutter. Couper le saumon désarêté en morceaux.",
  "Fouetter les œufs avec le lait et la crème ; assaisonner. Répartir épinards et saumon sur la pâte.",
  "Verser l'appareil, ajouter l'emmental et cuire environ 35 à 40 minutes, jusqu'à prise de la garniture et cuisson du poisson."],25,45,source="quiche-saumon",equipment=["plaque","poêle","four"])
r(59,[("chicken",700),("morel",180),("shallot",100),("light_cream",180),("butter",25),("stock_chicken",250),("parsley",10),("pepper",0.5)],
 ["Nettoyer soigneusement les morilles fraîches et les couper si nécessaire. Préparer les échalotes et les filets de poulet.",
  "Faire dorer le poulet dans une partie du beurre ; poursuivre jusqu'à cuisson complète et réserver.",
  "Faire suer les échalotes et cuire les morilles dans le reste du beurre pendant au moins quinze minutes ; ajouter un peu de liquide si nécessaire.",
  "Ajouter le bouillon, réduire puis incorporer la crème. Remettre le poulet et terminer la cuisson à feu doux.",
  "Poivrer et ajouter le persil. Goûter avant de saler, car le bouillon est déjà salé."],25,35,source="chapon-aux-morilles",notes=["Version maison réalisée avec des filets de poulet sans peau ; morilles fraîches, entièrement cuites."])
r(61,[("beef_fillet",650),("shallot",100),("light_cream",160),("stock_beef",180),("butter",25),("pepper",5),("salt",1)],
 ["Écraser grossièrement le poivre. Éponger les filets de bœuf et les assaisonner.",
  "Saisir la viande dans une partie du beurre, puis poursuivre selon l'épaisseur et la cuisson souhaitée. Laisser reposer.",
  "Faire suer les échalotes dans la poêle. Ajouter le bouillon et le poivre, décoller les sucs et réduire.",
  "Incorporer la crème, laisser épaissir puis ajouter le beurre restant hors du feu. Servir la sauce avec les filets, sans ajout d'alcool."],15,20,equipment=["plaque","poêle"])
r(62,[("veal_fillet",700),("mushroom",500),("shallot",120),("olive_oil",20),("butter",25),("water",200),("thyme",3),("salt",2),("pepper",0.5)],
 ["Préchauffer le four à 180 °C. Dorer le filet de veau dans l'huile et une partie du beurre, dans un récipient allant au four.",
  "Ajouter les échalotes, le thym et l'eau. Enfourner environ 25 à 35 minutes selon l'épaisseur, en arrosant et en vérifiant la cuisson.",
  "Dorer les champignons à part avec le beurre restant.",
  "Laisser reposer la viande dix minutes. Réduire le jus, ajouter les champignons puis trancher le filet en quatre portions."],20,35,rest=10,equipment=["plaque","poêle","four"])
r(65,[("bass",700),("celeriac",700),("potato",200),("milk",250),("butter",40),("lemon",40),("olive_oil",15),("salt",2),("pepper",0.5)],
 ["Couper le céleri-rave et les pommes de terre. Les cuire dans de l'eau frémissante jusqu'à tendreté, puis bien égoutter.",
  "Mixer ou écraser avec le lait chaud et la moitié du beurre ; assaisonner et garder au chaud.",
  "Éponger les filets de bar désarêtés et les cuire à la poêle avec l'huile, côté peau d'abord, jusqu'à cuisson de la chair.",
  "Dans la poêle, ajouter le citron et un peu d'eau puis le beurre restant hors du feu. Servir le bar avec la purée et la sauce."],25,30,equipment=["plaque","casserole","poêle"])
r(66,[("scallop",600),("leek",700),("shallot",100),("light_cream",100),("butter",35),("olive_oil",10),("lemon",25),("salt",1),("pepper",0.5)],
 ["Bien laver les poireaux et les émincer avec les échalotes. Les faire fondre dans une partie du beurre avec un peu d'eau, à couvert, environ vingt minutes.",
  "Ajouter la crème, le citron et l'assaisonnement, puis garder au chaud.",
  "Éponger les noix de Saint-Jacques. Chauffer la poêle avec l'huile et le reste du beurre, puis les saisir des deux côtés en adaptant la durée à leur taille, jusqu'à cuisson.",
  "Dresser la fondue de poireaux et les noix dans quatre assiettes et servir aussitôt."],20,30,equipment=["plaque","sauteuse","poêle"])
r(67,[("chicken",800),("mushroom",450),("shallot",100),("spinach",250),("butter",25),("light_cream",120),("water",250),("parsley",10),("salt",2),("pepper",0.5)],
 ["Hacher les champignons et les échalotes. Les cuire avec une partie du beurre jusqu'à évaporation de l'eau ; ajouter les épinards, bien égoutter et laisser tiédir.",
  "Ouvrir les filets de poulet en portefeuille et les aplatir entre deux feuilles de cuisson. Assaisonner, répartir une partie de la farce, rouler et ficeler.",
  "Dorer les ballotines avec le beurre restant. Ajouter l'eau, couvrir et cuire doucement 25 à 35 minutes selon leur épaisseur, jusqu'à cuisson complète.",
  "Retirer les ficelles. Ajouter la crème et le reste de farce au jus, réduire quelques minutes puis terminer au persil.",
  "Trancher les ballotines et servir avec la sauce."],35,40,source="ballotine-poulet-bresse-farci-morilles",notes=["Version maison au poulet, épinards et champignons de Paris ; les ballotines sont ficelées et cuites à la sauteuse."])
r(71,[("lamb_leg",1000),("carrot",300),("onion",250),("garlic",25),("olive_oil",25),("water",600),("thyme",3),("salt",4),("pepper",1)],
 ["Préchauffer le four à 120 °C. Préparer la viande désossée et les légumes ; assaisonner.",
  "Dorer l'agneau dans l'huile dans une cocotte, puis faire revenir les légumes et l'ail.",
  "Ajouter l'eau et le thym, couvrir soigneusement et enfourner environ sept heures. Vérifier de temps en temps le liquide et compléter pour éviter que la viande sèche.",
  "La viande doit se détacher facilement. Réduire le jus au besoin et partager avec les légumes en quatre portions."],25,420,equipment=["plaque","cocotte","four"],source="gigot-agneau-7-heures",notes=["Poids net de viande désossée ; cuisson longue sans ajout de vin."])
r(72,[("lamb_rack",750),("breadcrumbs",60),("parsley",25),("garlic",12),("mustard",25),("olive_oil",25),("butter",20),("salt",2),("pepper",0.5)],
 ["Préchauffer le four à 190 °C. Mixer la chapelure, le persil, l'ail et une partie de l'huile.",
  "Saisir l'agneau dans le beurre et le reste d'huile. Badigeonner la surface de moutarde puis appliquer la persillade.",
  "Enfourner environ vingt à trente minutes selon l'épaisseur et la cuisson souhaitée, en surveillant la croûte.",
  "Laisser reposer dix minutes avant de trancher et de répartir en quatre portions."],20,30,rest=10,source="carre-agneau-persille",equipment=["plaque","poêle","four"],notes=["La quantité indiquée est le poids comestible de viande, hors os ; prévoir la pièce entière en conséquence."])
r(73,[("monkfish",800),("tomato_pulp",400),("shallot",150),("garlic",15),("olive_oil",25),("tomato_paste",30),("water",350),("light_cream",80),("parsley",12),("salt",2),("pepper",0.5)],
 ["Parer la lotte en retirant sa membrane et la couper en médaillons. Faire dorer rapidement dans l'huile puis réserver.",
  "Faire suer les échalotes et l'ail dans la sauteuse, ajouter le concentré puis la pulpe de tomates et l'eau.",
  "Laisser réduire une vingtaine de minutes, puis remettre la lotte et poursuivre doucement jusqu'à cuisson de la chair.",
  "Ajouter la crème, assaisonner et terminer avec le persil. Servir en quatre portions."],25,35,source="lotte-americaine",notes=["Adaptation maison à la tomate, sans vin ni cognac."])
r(77,[("egg",200),("mushroom",350),("shallot",80),("light_cream",120),("butter",20),("parsley",10),("salt",1),("pepper",0.5)],
 ["Préchauffer le four à 170 °C. Faire suer les échalotes dans le beurre, ajouter les champignons et cuire jusqu'à évaporation de leur eau.",
  "Répartir les champignons et la crème dans quatre ramequins beurrés avec une partie de la quantité prévue.",
  "Ajouter un œuf par ramequin, assaisonner et placer les ramequins dans un plat contenant de l'eau chaude.",
  "Cuire au bain-marie au four environ douze à dix-huit minutes, jusqu'à prise des blancs et cuisson souhaitée des œufs. Terminer au persil."],15,25,course="starter",equipment=["plaque","poêle","four"],notes=["200 g d'œufs sans coquille correspondent approximativement à quatre œufs moyens ; les poids en grammes font foi."])
r(79,[("chicken_skin",850),("mushroom",400),("onion",150),("cream",200),("butter",25),("water",400),("thyme",2),("salt",2),("pepper",0.5)],
 ["Assaisonner les morceaux de poulet désossés avec peau et les dorer dans le beurre.",
  "Ajouter l'oignon et faire suer. Verser l'eau et ajouter le thym ; couvrir et cuire doucement environ trente minutes, jusqu'à cuisson complète du poulet.",
  "Faire dorer les champignons à part dans un peu du jus de cuisson, puis les ajouter à la cocotte.",
  "Ajouter la crème et laisser réduire doucement, sans dessécher le poulet. Rectifier l'assaisonnement et servir."],20,45,notes=["Les quantités sont des poids nets de viande et peau ; référence nutritionnelle moyenne du poulet, non spécifique à l'élevage Bresse."])
r(80,[("puff",400),("chicken",600),("mushroom",500),("shallot",120),("light_cream",180),("butter",25),("flour",25),("milk",200),("egg",30),("parsley",10),("salt",2),("pepper",0.5)],
 ["Couper le poulet en dés. Le cuire au beurre, puis faire suer les échalotes et les champignons jusqu'à disparition de leur eau.",
  "Ajouter la farine, mélanger puis incorporer le lait et la crème. Faire épaissir, assaisonner et ajouter le persil. Laisser refroidir complètement.",
  "Préchauffer le four à 190 °C. Foncer un moule avec la moitié de la pâte, ajouter la garniture froide et couvrir avec le reste de pâte.",
  "Souder les bords, faire une cheminée et dorer avec l'œuf pesé.",
  "Cuire environ 35 à 45 minutes, jusqu'à une pâte bien dorée et une garniture chaude."],35,55,rest=30,source="tourte-poulet-poireau",equipment=["plaque","poêle","four"],notes=["Version maison aux champignons, différente de la garniture poulet-poireau de la référence technique."])
r(81,[("beef_fillet",750),("mushroom",500),("shallot",120),("puff",350),("butter",25),("mustard",25),("egg",35),("salt",2),("pepper",0.5)],
 ["Saisir rapidement le filet de bœuf au beurre, assaisonner puis laisser refroidir.",
  "Hacher les champignons et les échalotes. Les cuire dans le jus restant jusqu'à obtenir une duxelles bien sèche ; refroidir.",
  "Préchauffer le four à 200 °C. Étaler la pâte, répartir la duxelles et poser le filet badigeonné de moutarde. Fermer et souder la pâte.",
  "Dorer avec l'œuf pesé et pratiquer une petite ouverture pour la vapeur. Cuire environ 25 à 35 minutes selon l'épaisseur et la cuisson souhaitée.",
  "Laisser reposer dix minutes avant de trancher."],35,40,rest=30,source="filet-boeuf-croute",equipment=["plaque","poêle","four"],notes=["Version sans jambon, sans crépine et sans alcool ; garniture de champignons."])
r(82,[("veal_fillet",700),("shallot",120),("light_cream",150),("butter",25),("water",180),("tarragon",12),("salt",2),("pepper",0.5)],cream_steps("les médaillons de filet de veau","l'estragon ciselé",10,mushrooms=False),20,25)
r(83,[("cod",750),("shrimp",250),("shallot",100),("light_cream",180),("butter",25),("tomato_paste",15),("water",180),("lemon",25),("parsley",10),("salt",1),("pepper",0.5)],
 ["Préchauffer le four à 180 °C. Placer le cabillaud désarêté dans un plat avec un peu d'eau et l'assaisonner ; cuire environ quinze à vingt minutes selon l'épaisseur.",
  "Faire suer les échalotes au beurre. Ajouter le concentré et l'eau, laisser réduire puis incorporer la crème.",
  "Ajouter les crevettes déjà cuites et décortiquées, puis les réchauffer doucement sans cuisson prolongée.",
  "Terminer au citron et au persil. Servir la sauce aux crevettes avec le cabillaud."],20,25,equipment=["plaque","casserole","four"])
r(84,[("coley",750),("potato",850),("milk",200),("butter",55),("lemon",40),("olive_oil",15),("parsley",10),("salt",2),("pepper",0.5)],
 ["Cuire les pommes de terre, égoutter puis les écraser avec le lait chaud et une partie du beurre. Assaisonner.",
  "Éponger les filets de lieu désarêtés. Les cuire à la poêle dans l'huile jusqu'à cuisson de la chair.",
  "Réserver le poisson. Ajouter le citron et quelques cuillerées d'eau, décoller les sucs puis incorporer le beurre restant hors du feu.",
  "Terminer au persil et servir avec l'écrasé de pommes de terre."],20,30,equipment=["plaque","casserole","poêle"])
r(87,[("mushroom",700),("onion",200),("potato",250),("water",900),("light_cream",120),("butter",25),("parsley",10),("salt",3),("pepper",0.5)],
 ["Faire suer l'oignon au beurre, ajouter les champignons et les laisser légèrement dorer.",
  "Ajouter la pomme de terre en dés et l'eau ; assaisonner puis cuire environ vingt-cinq minutes.",
  "Mixer finement avec la crème. Ajuster la consistance avec de l'eau chaude si nécessaire.",
  "Réchauffer doucement et terminer avec le persil."],15,35,course="starter",source="veloute-cepes-espuma-truffe",notes=["Version maison aux champignons de Paris, sans espuma ni truffe."])
r(89,[("beef_fillet",650),("foie_gras",100),("bread",120),("shallot",100),("stock_beef",220),("butter",35),("pepper",1)],
 ["Détailler le pain en quatre supports et le faire dorer dans une petite partie du beurre.",
  "Cuire les tournedos dans le beurre restant selon leur épaisseur et la cuisson souhaitée ; laisser reposer.",
  "Faire suer les échalotes dans la poêle, ajouter le bouillon et réduire pour obtenir un jus court.",
  "Poser chaque tournedos sur le pain, ajouter une tranche de foie gras de canard déjà cuit et napper de jus chaud.",
  "Utiliser un foie gras nature dont la composition ne contient pas d'alcool ; cette version ne contient pas de sauce alcoolisée."],20,20,source="tournedos-rossini",equipment=["plaque","poêle"],notes=["Adaptation maison avec foie gras cuit nature et jus de bœuf sans alcool ; vérifier la composition du produit acheté."])
r(90,[("veal_rib",750),("apple",400),("mushroom",350),("shallot",100),("cream",180),("butter",35),("water",200),("salt",2),("pepper",0.5)],
 ["Couper les pommes en quartiers et les faire dorer avec une partie du beurre ; réserver.",
  "Dorer le veau dans une sauteuse puis poursuivre doucement jusqu'à cuisson à cœur ; réserver au chaud.",
  "Faire suer les échalotes et cuire les champignons dans les sucs. Ajouter l'eau, décoller les sucs puis faire réduire.",
  "Incorporer la crème et les pommes, remettre le veau puis réchauffer quelques minutes. Rectifier l'assaisonnement."],25,35,notes=["Poids net comestible du veau, hors os. Version sans alcool."])
r(91,[("mullet",700),("tomato",350),("shallot",80),("olive_oil",45),("lemon",35),("basil",15),("salt",2),("pepper",0.5)],
 ["Couper les tomates et les échalotes en très petits dés. Mélanger avec la majeure partie de l'huile, le citron et le basilic ciselé ; assaisonner.",
  "Éponger les filets de rouget désarêtés. Les cuire à la poêle avec le reste d'huile, côté peau d'abord, jusqu'à cuisson de la chair.",
  "Répartir les filets en quatre assiettes et ajouter la sauce vierge à température ambiante au dernier moment."],20,12,source="filet-rouget-poivrons",equipment=["plaque","poêle"],notes=["Version maison à la sauce vierge tomate-basilic ; la référence liée décrit une autre garniture de rouget."])
r(92,[("turbot",750),("lemon",50),("butter",50),("olive_oil",15),("parsley",12),("water",120),("salt",2),("pepper",0.5)],
 ["Préchauffer le four à 180 °C. Éponger et assaisonner les filets de turbot désarêtés.",
  "Les déposer dans un plat avec l'huile, une partie du beurre et l'eau. Cuire environ quinze à vingt-cinq minutes selon l'épaisseur, jusqu'à cuisson de la chair.",
  "Réserver le poisson et réduire le jus de cuisson. Ajouter le citron puis incorporer le beurre restant hors du feu.",
  "Terminer au persil et servir en quatre portions."],15,25,source="turbot-champagne",equipment=["four","plaque","casserole"],notes=["Adaptation maison citronnée sans alcool ; les ingrédients de la page de référence ont été modifiés."])
r(93,[("peter",750),("leek",700),("shallot",120),("light_cream",120),("butter",35),("olive_oil",15),("lemon",25),("salt",2),("pepper",0.5)],
 ["Faire fondre les poireaux et les échalotes émincés avec une partie du beurre et un peu d'eau, à couvert, environ vingt-cinq minutes.",
  "Ajouter la crème et le citron ; assaisonner et garder au chaud.",
  "Éponger les filets de Saint-Pierre désarêtés et les cuire à la poêle dans l'huile et le reste du beurre, en adaptant la durée à leur épaisseur.",
  "Répartir la fondue de poireaux et les filets dans quatre assiettes."],25,30,equipment=["plaque","sauteuse","poêle"])
r(94,[("cod",400),("mullet",300),("tomato",500),("onion",200),("fennel",250),("garlic",20),("olive_oil",30),("tomato_paste",30),("water",1400),("saffron",0.15),("bread",100),("mayo",50),("paprika",2),("salt",3),("pepper",0.5)],
 ["Faire suer l'oignon et le fenouil dans l'huile. Ajouter l'ail, les tomates, le concentré et le safran.",
  "Verser l'eau, assaisonner et laisser mijoter vingt-cinq minutes.",
  "Ajouter les poissons désarêtés et cuire jusqu'à cuisson complète. Mixer finement la soupe puis passer au tamis si nécessaire.",
  "Mélanger la mayonnaise avec une petite partie de l'ail pesé et le paprika pour une rouille maison simplifiée.",
  "Griller le pain et servir la soupe avec le pain et la rouille répartis en quatre portions."],30,40,course="starter",notes=["Version maison simplifiée au cabillaud et au rouget ; la rouille est une variante à base de mayonnaise."])
r(95,[("shrimp",400),("onion",180),("carrot",150),("celery",100),("tomato_paste",40),("olive_oil",25),("water",1000),("cream",120),("rice",40),("paprika",2),("salt",2),("pepper",0.5)],
 ["Garder quelques crevettes cuites décortiquées pour le service. Faire revenir l'oignon, la carotte et le céleri dans l'huile.",
  "Ajouter le concentré et le paprika, puis l'eau et le riz. Laisser cuire environ vingt-cinq minutes, jusqu'à ce que les légumes et le riz soient tendres.",
  "Ajouter le reste des crevettes déjà cuites et réchauffer doucement quelques minutes.",
  "Mixer très finement, passer au tamis si souhaité et incorporer la crème. Ajuster la consistance et l'assaisonnement.",
  "Répartir dans quatre bols et garnir avec les crevettes réservées. Cette version sans carapaces ni alcool est une adaptation maison."],20,35,course="starter",source="bisque-homard",notes=["Bisque maison simplifiée à la chair de crevettes cuites ; aucune extraction de nutriments de carapaces n'est supposée."])
r(96,[("scallop",650),("mushroom",400),("shallot",120),("milk",350),("light_cream",100),("butter",35),("flour",35),("breadcrumbs",40),("emmental",60),("salt",2),("pepper",0.5)],
 ["Faire suer les échalotes dans une partie du beurre, ajouter les champignons et cuire jusqu'à évaporation de leur eau.",
  "Préparer une sauce avec le beurre restant et la farine, puis incorporer progressivement le lait. Faire épaissir et ajouter la crème.",
  "Mélanger les champignons à la sauce. Répartir les noix de Saint-Jacques et la sauce dans quatre plats à gratin.",
  "Ajouter emmental et chapelure. Cuire au four à 190 °C environ quinze à vingt minutes, jusqu'à cuisson des noix et coloration du dessus."],25,35,source="coquille-saint-jacques-bretonne",equipment=["plaque","casserole","four"])
r(98,[("beef_cooked",650),("onion",500),("butter",30),("flour",25),("stock_beef",350),("vinegar",25),("cornichon",70),("breadcrumbs",40),("parsley",10),("pepper",0.5)],
 ["Émincer les oignons et les faire fondre au beurre une vingtaine de minutes, jusqu'à une légère coloration.",
  "Ajouter la farine, remuer puis verser progressivement le bouillon. Incorporer le vinaigre et les cornichons coupés ; laisser épaissir.",
  "Couper le bœuf déjà cuit en tranches. Le disposer dans un plat avec la sauce et réchauffer soigneusement.",
  "Ajouter la chapelure et gratiner au four à 200 °C, puis terminer au persil."],20,40,equipment=["plaque","casserole","four"],notes=["La quantité est celle du bœuf déjà cuit et comestible, avant son réchauffage."])
r(99,[("beef_roast",800),("shallot",300),("butter",35),("olive_oil",15),("stock_beef",250),("vinegar",15),("thyme",2),("salt",1),("pepper",0.5)],
 ["Sortir le rôti du froid le temps de préparer les ingrédients. Préchauffer le four à 190 °C et émincer les échalotes.",
  "Saisir le bœuf sur toutes ses faces avec l'huile et une partie du beurre. Assaisonner, puis enfourner environ vingt-cinq à trente-cinq minutes selon l'épaisseur et la cuisson souhaitée.",
  "Laisser reposer quinze minutes. Pendant ce temps, faire fondre les échalotes dans le beurre restant.",
  "Ajouter le vinaigre et le bouillon, décoller les sucs et réduire. Trancher le rôti et servir avec la sauce."],20,35,rest=15,equipment=["plaque","poêle","four"])
r(106,[("sweetbread",700),("morel",180),("shallot",120),("cream",180),("butter",35),("water",250),("parsley",10),("salt",2),("pepper",0.5)],
 ["Faire dégorger les ris de veau dans de l'eau froide pendant une heure en renouvelant l'eau. Les blanchir cinq minutes dans de l'eau frémissante, rafraîchir puis retirer délicatement membranes et parties dures.",
  "Égoutter et presser légèrement les ris pendant une trentaine de minutes. Les couper en portions.",
  "Nettoyer les morilles fraîches. Faire suer les échalotes et cuire les morilles au beurre au moins quinze minutes ; ajouter un peu d'eau pour éviter qu'elles attachent.",
  "Dorer les ris de veau dans une autre poêle avec le beurre restant et poursuivre leur cuisson.",
  "Ajouter l'eau et la crème aux morilles, réduire doucement puis réunir avec les ris. Assaisonner et terminer au persil."],35,40,rest=90,source="ris-veau-pissalat-anchois",notes=["La référence liée sert à la préparation des ris ; la garniture maison est aux morilles entièrement cuites."])
r(110,[("salmon",700),("lemon",50),("butter",55),("olive_oil",15),("parsley",10),("salt",2),("pepper",0.5)],fish_pan_steps("les filets de saumon"),15,20,equipment=["plaque","poêle"])
r(114,[("leek",650),("potato",350),("onion",150),("butter",25),("water",1100),("light_cream",100),("salt",3),("pepper",0.5)],
 ["Laver soigneusement les poireaux et les émincer avec l'oignon. Les faire fondre au beurre sans coloration.",
  "Ajouter les pommes de terre en dés et l'eau. Assaisonner et laisser frémir environ vingt-cinq minutes, jusqu'à tendreté.",
  "Mixer avec la crème, puis ajuster la consistance avec de l'eau chaude si nécessaire.",
  "Réchauffer doucement, goûter et répartir en quatre bols."],15,35,course="starter",source="potage-pomme-terre")
r(116,[("cauliflower",800),("potato",250),("onion",150),("butter",25),("milk",250),("water",850),("light_cream",100),("salt",3),("pepper",0.5)],
 ["Détailler le chou-fleur, couper les pommes de terre et émincer l'oignon.",
  "Faire suer l'oignon au beurre, ajouter chou-fleur et pommes de terre puis verser le lait et l'eau.",
  "Assaisonner et cuire doucement environ vingt-cinq minutes, jusqu'à tendreté des légumes.",
  "Mixer finement avec la crème, ajuster la consistance et réchauffer sans forte ébullition."],20,30,course="starter")
r(117,[("egg",300),("mayo",55),("mustard",10),("parsley",8),("lemon",10),("pepper",0.5)],
 ["Cuire les œufs dans de l'eau frémissante pour obtenir des œufs durs, puis les refroidir et les écaler.",
  "Couper les œufs en deux. Retirer les jaunes et en réserver une petite partie pour la finition.",
  "Écraser les jaunes avec la mayonnaise, la moutarde, le citron et le poivre.",
  "Garnir les blancs, puis parsemer de jaune réservé émietté et de persil. Conserver au froid jusqu'au service."],20,12,servings=6,course="starter",source="oeuf-mimosa-paques",notes=["300 g d'œufs sans coquille représentent environ six œufs moyens ; les données sont une estimation à partir du poids des œufs avant cuisson."])
r(120,[("flour",150),("butter",80),("water",150),("milk",100),("egg",250),("comte",140),("salt",1),("pepper",0.5)],
 ["Préchauffer le four à 190 °C. Porter à frémissement l'eau, le lait, le beurre et le sel.",
  "Hors du feu, ajouter la farine d'un coup et mélanger. Remettre sur feu doux pour dessécher la panade une à deux minutes.",
  "Transférer dans un saladier et laisser tiédir. Ajouter progressivement les œufs battus pesés, puis le comté râpé et le poivre ; ajuster l'ajout d'œuf à la consistance de la pâte.",
  "Dresser environ vingt-quatre petites gougères. Cuire environ vingt-cinq à trente minutes sans ouvrir le four au début, jusqu'à des choux gonflés et secs.",
  "Servir par portions de quatre pièces environ."],25,35,servings=6,course="starter",source="gougeres",equipment=["plaque","casserole","four"],notes=["Le calcul inclut tous les œufs prévus ; si une partie n'est pas incorporée, les apports réels seront légèrement inférieurs."])
r(122,[("cream",400),("milk",100),("yolk",80),("sugar",80),("vanilla",2)],
 ["Préchauffer le four à 120 °C. Chauffer le lait et la crème avec la gousse de vanille fendue, puis laisser infuser quinze minutes et retirer la gousse.",
  "Mélanger les jaunes pesés avec les trois quarts du sucre, sans trop faire mousser. Verser progressivement le liquide tiède en remuant.",
  "Répartir dans quatre ramequins et cuire au bain-marie environ quarante-cinq à soixante minutes, jusqu'à une crème prise mais encore légèrement tremblante.",
  "Laisser refroidir puis réfrigérer au moins quatre heures.",
  "Répartir le sucre restant sur les crèmes froides et caraméliser au chalumeau juste avant de servir."],20,60,rest=255,course="dessert",source="creme-brulee",equipment=["plaque","casserole","four","chalumeau"],notes=["La gousse retirée après infusion n'est pas comptée comme consommée ; les composés extraits par infusion ne sont pas quantifiés."])
r(123,[("chocolate",200),("egg",300),("sugar",25),("salt",0.5)],
 ["Faire fondre doucement le chocolat au bain-marie puis le laisser tiédir.",
  "Séparer les œufs. Incorporer les jaunes au chocolat tiède en mélangeant.",
  "Monter les blancs avec le sel puis serrer avec le sucre. Incorporer une petite partie au chocolat, puis le reste délicatement.",
  "Répartir dans six ramequins et réfrigérer au moins quatre heures avant le service.",
  "Utiliser des œufs adaptés à une préparation non recuite, ou des ovoproduits pasteurisés équivalents ; conserver la mousse au froid et la consommer rapidement."],25,5,rest=240,servings=6,course="dessert",source="mousse-chocolat",equipment=["plaque","casserole","batteur"],notes=["Estimation pour six portions ; recette non recuite après incorporation des œufs."])

def normalized(text):
    return "".join(c for c in unicodedata.normalize("NFD", text.lower()) if not unicodedata.combining(c)).strip()

def signature(ingredients, servings):
    strings = sorted(json.dumps([normalized(x["ingredient_name"]),x["quantity"],normalized(x["unit"])],ensure_ascii=False,separators=(",",":")) for x in ingredients)
    return json.dumps(dict(servings=servings,ingredients=strings),ensure_ascii=False,separators=(",",":"))

def build(ciqual_path, selection_path, output_path):
    reference=json.loads(Path(ciqual_path).read_text())
    foods={row["code"]:row for row in reference["foods"]}
    selection=json.loads(Path(selection_path).read_text())
    selected={x["selection_id"]:x["name"] for x in selection["approved"]}
    assert len(RECIPES)==len(selected)==53 and {x["selection_id"] for x in RECIPES}==set(selected)
    now=datetime.datetime.now(datetime.timezone.utc).isoformat(timespec="seconds").replace("+00:00","Z")
    result=[];used={}
    for item in RECIPES:
        ingredients=[];refs=[];assumptions=list(item["assumptions"])
        totals={k:0.0 for k in next(iter(foods.values()))["values"]};missing=set();upper=set()
        for key,grams in item["amounts"]:
            name,code=FOODS[key];food=foods[code];used[code]=food
            assumptions.extend(f"{name} : {note}" for note in food.get("assumptions", []))
            amount=int(grams) if float(grams).is_integer() else grams
            ingredients.append(dict(ingredient_name=name,quantity=amount,unit="g",is_essential=True))
            consumed=0 if key=="vanilla" else grams
            refs.append(dict(ingredient_name=name,food_code=code,food_name=food["name"],weight_g=consumed))
            for nutrient,value in food["values"].items():
                if consumed==0:continue
                if value is None:missing.add(nutrient);continue
                if not math.isfinite(value) or value<0:raise ValueError(f"Invalid reference {code}: {nutrient}")
                totals[nutrient]+=value*consumed/100/item["servings"]
                if nutrient in food["upper_bounds"]:upper.add(nutrient)
        values={k:None if k in missing else (math.ceil(v*1e6)/1e6 if k in upper else round(v,6)) for k,v in totals.items()}
        upper=sorted(k for k in upper if values[k] is not None and values[k]>0)
        assumptions += ["Quantités exprimées en poids nets comestibles, en grammes ; les os, arêtes et coquilles ne sont pas inclus.",
          "Les références Ciqual sont des compositions moyennes, sans correction des pertes, des jus écartés ni du rendement de cuisson.",
          "Les produits et leur teneur en sel ou matière grasse peuvent différer de ces références."]
        envelope=dict(schema_version=1,source="ciqual2020",computed_at=now,
          ingredient_signature=signature(ingredients,item["servings"]),base_servings=item["servings"],
          per_serving=values,upper_bounds=upper,ingredients=refs,missing_ingredients=[],assumptions=assumptions,
          reference_url="https://www.data.gouv.fr/api/1/datasets/5369a15fa3a729239d2065b7/")
        source_url=f"https://www.meilleurduchef.com/fr/recette/{item['source_slug']}.html" if item["source_slug"] else None
        result.append(dict(selection_id=item["selection_id"],name=selected[item["selection_id"]],
          description="Version maison sans porc ni alcool, avec quantités et portions explicites. Les valeurs nutritionnelles sont estimées à partir de Ciqual 2020."
            + (" La page liée est une référence d'inspiration ou de technique ; cette adaptation peut différer de sa composition." if source_url else ""),
          instructions=item["instructions"],ingredients=ingredients,prep_time=item["prep_time"],
          cook_time=item["cook_time"],rest_time=item["rest_time"],servings=item["servings"],
          cuisine_category=item["cuisine"],meal_type="snack" if item["course"] in ["starter","dessert"] else "dinner",
          tags=["classiques-maison","sans-porc","sans-alcool",{"starter":"entrée","main":"plat","dessert":"dessert"}[item["course"]]],
          difficulty=3 if item["selection_id"] in [67,71,72,81,106,120] else 2,required_equipment=item["required_equipment"],
          source_type="manual",source_url=source_url,image_url=None,nutrition_info=envelope))
    path=Path(output_path);path.parent.mkdir(parents=True,exist_ok=True)
    path.write_text(json.dumps(dict(collection_id="classics-approved-2026-11-09",recipe_count=len(result),
      reference=dict(name="Anses Ciqual 2020",original_url=reference["original_url"],mirror_sha256=reference["mirror_sha256"]),
      recipes=result),ensure_ascii=False,indent=2))
    (ROOT/"data/nutrition/ciqual2020-classics-reference.json").write_text(json.dumps(dict(source=reference["source"],original_url=reference["original_url"],
      mirror_sha256=reference["mirror_sha256"],foods=[used[k] for k in sorted(used)]),ensure_ascii=False,indent=2))
    print(json.dumps(dict(recipes=len(result),foods=len(used),source_links=sum(bool(r["source_url"]) for r in result),
      core_complete=sum(all(r["nutrition_info"]["per_serving"][k] is not None for k in ["energyKcal","proteinG","fiberG","carbsG","fatG"]) for r in result)),ensure_ascii=False))

if __name__=="__main__":
    parser=argparse.ArgumentParser()
    parser.add_argument("--ciqual",required=True);parser.add_argument("--selection",required=True)
    parser.add_argument("--output",default=str(ROOT/"data/recipes/classics-approved-2026-11-09.json"))
    args=parser.parse_args();build(args.ciqual,args.selection,args.output)

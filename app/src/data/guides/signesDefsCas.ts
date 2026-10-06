import type { SigneDefBody } from './signes';

// ============================================================================
// K4 (ADR-0023, contrat `frage-atomique.md` §10.2) — les signes des QUESTIONS DU CAS.
// Une question du cas déclare le signe qu'elle pose vraiment (règle d'identité : deux
// questions cherchent le même signe ssi la fiche y répond par la même réplique). Quand
// aucune sonde ni aucun signe existant n'a cette réplique — une question CIBLÉE, que la
// question générale du chapitre ne remplace pas (« Gallensteine bekannt ? » n'est pas
// « Vorerkrankungen ? ») —, le signe est créé ici. Aucun n'a de banque : r3 ne les ajoute
// jamais ; tous sont de dépistage : r1 n'y touche pas. Le chapitre est celui où la
// question se pose (il ne sert qu'à la règle d'insertion, que ces signes n'atteignent pas).
// Réutilisés d'un cas à l'autre quand la réplique est de même nature (un cas ne pose
// jamais deux questions du même signe : `doublonsCas`).
// ============================================================================
const S = 'screening' as const;
export const DEFS_CAS = {
  // --- Aktuelle Beschwerden : précisions ciblées du motif -----------------------
  stress_ausloeser: { kapitel: 'aktuell', pertinence: S },          // déclenché par une émotion, le stress (et non l'effort)
  allergen_ausloeser: { kapitel: 'aktuell', pertinence: S },        // pollen, animaux, saison, dedans / dehors
  episoden_haeufigkeit: { kapitel: 'aktuell', pertinence: S },      // combien d'épisodes par semaine, par an
  latenz: { kapitel: 'aktuell', pertinence: S },                    // délai entre l'exposition (piqûre, infection, retour) et les troubles
  latenz_nach_essen: { kapitel: 'aktuell', pertinence: S },         // délai entre le repas et les troubles
  prodromi: { kapitel: 'aktuell', pertinence: S },                  // ce qui a précédé (douleur avant l'éruption, état grippal avant l'ictère)
  rueckbildung: { kapitel: 'aktuell', pertinence: S },              // les troubles ont-ils complètement régressé
  schmerzwanderung: { kapitel: 'aktuell', pertinence: S },          // la douleur s'est déplacée (ombilic → fosse iliaque droite)
  erschuetterung: { kapitel: 'aktuell', pertinence: S },            // douleur aux secousses (marcher, sauter, route cahoteuse)
  pressschmerz: { kapitel: 'aktuell', pertinence: S },              // douleur à la toux, à l'éternuement, à la poussée
  anlaufschmerz: { kapitel: 'aktuell', pertinence: S },             // douleur des premiers pas, qui cède en marchant
  nachtschmerz: { kapitel: 'aktuell', pertinence: S },              // la douleur réveille la nuit (hors appareil locomoteur)
  defaekation_besserung: { kapitel: 'aktuell', pertinence: S },     // la douleur cède après la selle
  steigung: { kapitel: 'aktuell', pertinence: S },                  // en montée ou en descente
  treppensteigen: { kapitel: 'aktuell', pertinence: S },            // descendre ou monter l'escalier
  einkaufswagenzeichen: { kapitel: 'aktuell', pertinence: S },      // mieux penché en avant (caddie, vélo)
  armhebe_entlastung: { kapitel: 'aktuell', pertinence: S },        // mieux le bras posé sur la tête
  bewegungsdrang: { kapitel: 'aktuell', pertinence: S },            // ne tient pas en place (colique)
  beweglichkeit: { kapitel: 'aktuell', pertinence: S },             // amplitude : tourner la jambe, enfiler une chaussette
  mechanische_zeichen: { kapitel: 'aktuell', pertinence: S },       // craque, se bloque, se dérobe
  umknicken: { kapitel: 'aktuell', pertinence: S },                 // sens de l'entorse (en dedans, en dehors)
  sturzhergang: { kapitel: 'aktuell', pertinence: S },              // a-t-il pu se rattraper en tombant
  liegezeit: { kapitel: 'aktuell', pertinence: S },                 // s'est-il relevé, combien de temps au sol
  kopfanprall: { kapitel: 'aktuell', pertinence: S },               // la tête a-t-elle heurté
  helm: { kapitel: 'aktuell', pertinence: S },                      // casque porté, abîmé
  orthostase: { kapitel: 'aktuell', pertinence: S },                // vertige en se levant
  projektion: { kapitel: 'aktuell', pertinence: S },                // le genou est-il vraiment en cause (douleur projetée)
  haendigkeit: { kapitel: 'aktuell', pertinence: S },               // main dominante
  atrophie: { kapitel: 'aktuell', pertinence: S },                  // fonte musculaire (éminence thénar)
  fingerendgelenke: { kapitel: 'aktuell', pertinence: S },          // atteinte des interphalangiennes distales
  daktylitis: { kapitel: 'aktuell', pertinence: S },                // doigt ou orteil « en saucisse »
  naegel: { kapitel: 'aktuell', pertinence: S },                    // ongles : ponctuations, taches, décollement
  fersenschmerz: { kapitel: 'aktuell', pertinence: S },             // talalgie
  entzuendlicher_rueckenschmerz: { kapitel: 'aktuell', pertinence: S },   // dorsalgie nocturne, raide le matin, mieux en bougeant
  kopfhaut: { kapitel: 'aktuell', pertinence: S },
  nackenschmerz: { kapitel: 'aktuell', pertinence: S },             // douleurs de la nuque, inhabituelles
  augenbrauen: { kapitel: 'aktuell', pertinence: S },               // sourcils clairsemés en dehors (≠ `haut_haare`, la peau et les cheveux)                  // cuir chevelu douloureux
  kieferclaudicatio: { kapitel: 'aktuell', pertinence: S },         // douleur de la mâchoire en mâchant
  myalgie: { kapitel: 'aktuell', pertinence: S },                   // douleurs musculaires au point de ne plus se lever
  allodynie: { kapitel: 'aktuell', pertinence: S },                 // le simple contact des vêtements fait mal
  lhermitte: { kapitel: 'aktuell', pertinence: S },                 // décharge électrique dans le dos à la flexion du cou
  farbsehen: { kapitel: 'aktuell', pertinence: S },                 // couleurs délavées (désaturation du rouge)
  amaurosis: { kapitel: 'aktuell', pertinence: S },                 // perte de vision brève d'un œil
  photophobie: { kapitel: 'aktuell', pertinence: S },               // gêné par la lumière, le bruit
  hoerminderung: { kapitel: 'aktuell', pertinence: S },             // entend moins bien
  tinnitus: { kapitel: 'aktuell', pertinence: S },                  // sifflement, bourdonnement, pression dans l'oreille
  otorrhoe: { kapitel: 'aktuell', pertinence: S },                  // l'oreille a coulé
  mastoiditis_zeichen: { kapitel: 'aktuell', pertinence: S },       // rougeur, gonflement derrière l'oreille
  nasenatmung: { kapitel: 'aktuell', pertinence: S },               // nez bouché
  nasensekret: { kapitel: 'aktuell', pertinence: S },               // couleur et aspect de l'écoulement nasal
  schnupfen: { kapitel: 'aktuell', pertinence: S },                 // rhume, éternuements
  riechen: { kapitel: 'aktuell', pertinence: S },                   // odorat
  rachenbefund: { kapitel: 'aktuell', pertinence: S },              // ce qu'il a vu dans sa gorge (amygdales, dépôts)
  kieferklemme: { kapitel: 'aktuell', pertinence: S },              // ouvre-t-il la bouche, salive-t-il
  zunge: { kapitel: 'aktuell', pertinence: S },                     // langue qui brûle, lisse, rouge ; perlèche
  odynophagie: { kapitel: 'aktuell', pertinence: S },               // douleur en avalant (≠ `schluck`, ce qui reste coincé)
  regurgitation: { kapitel: 'aktuell', pertinence: S },             // nourriture non digérée qui remonte
  aspiration: { kapitel: 'aktuell', pertinence: S },                // oreiller mouillé, fausses routes la nuit
  fleischaversion: { kapitel: 'aktuell', pertinence: S },           // dégoût de la viande
  pica: { kapitel: 'aktuell', pertinence: S },                      // envie de glaçons, de terre
  stuhlkaliber: { kapitel: 'aktuell', pertinence: S },              // selles « en crayon »
  perianal: { kapitel: 'aktuell', pertinence: S },                  // tuméfaction, fistule, écoulement près de l'anus
  restharn: { kapitel: 'aktuell', pertinence: S },                  // vessie jamais vide
  hodenschwellung: { kapitel: 'aktuell', pertinence: S },           // testicule gonflé, rouge, ascensionné
  blutklumpen: { kapitel: 'aktuell', pertinence: S },               // caillots, tissu expulsé
  pilzinfektion: { kapitel: 'aktuell', pertinence: S },             // mycose (génitale, buccale)
  pruritus: { kapitel: 'aktuell', pertinence: S },                  // démangeaison GÉNÉRALISÉE (≠ `juckreiz` d'une lésion, K3 § 8)
  petechien: { kapitel: 'aktuell', pertinence: S },                 // points rouges qui ne s'effacent pas à la pression
  nekrose_zeichen: { kapitel: 'aktuell', pertinence: S },           // bulles, plaques noires, crépitation, douleur disproportionnée
  lymphangitis: { kapitel: 'aktuell', pertinence: S },              // traînée rouge qui remonte
  fusspilz: { kapitel: 'aktuell', pertinence: S },                  // intertrigo, mycose entre les orteils
  photosensibilitaet: { kapitel: 'aktuell', pertinence: S },        // éruption au soleil
  endokarditis_hautzeichen: { kapitel: 'aktuell', pertinence: S },  // nodules, stries, taches des doigts et des paumes
  hautknoetchen: { kapitel: 'aktuell', pertinence: S },             // nodules sous-cutanés indolores
  angiooedem: { kapitel: 'aktuell', pertinence: S },                // lèvres, langue, paupières gonflées
  oedem_qualitaet: { kapitel: 'aktuell', pertinence: S },           // œdème : symétrique, prend-il le godet
  obere_einflussstauung: { kapitel: 'aktuell', pertinence: S },     // visage bouffi le matin, veines du cou saillantes
  milz_druck: { kapitel: 'aktuell', pertinence: S },                // pesanteur de l'hypocondre gauche
  pulsation: { kapitel: 'aktuell', pertinence: S },                 // battement dans le ventre
  puls: { kapitel: 'aktuell', pertinence: S },                      // pouls lent pendant la fièvre
  priapismus: { kapitel: 'aktuell', pertinence: S },                // érections prolongées
  keuchen: { kapitel: 'aktuell', pertinence: S },                   // reprise inspiratoire bruyante après la quinte
  schluckverschieblich: { kapitel: 'aktuell', pertinence: S },      // la tuméfaction monte à la déglutition
  reponierbarkeit: { kapitel: 'aktuell', pertinence: S },           // la hernie se réduit-elle
  inkarzeration: { kapitel: 'aktuell', pertinence: S },             // la hernie s'est-elle déjà bloquée
  verschieblichkeit: { kapitel: 'aktuell', pertinence: S },         // le ganglion est-il mobile
  alkoholschmerz: { kapitel: 'aktuell', pertinence: S },            // douleur du ganglion après l'alcool
  alkohol_besserung: { kapitel: 'aktuell', pertinence: S },         // le tremblement change-t-il après un verre
  chorea: { kapitel: 'aktuell', pertinence: S },                    // mouvements involontaires, maladresse
  verwirrtheit: { kapitel: 'aktuell', pertinence: S },              // confusion, somnolence
  liquorrhoe: { kapitel: 'aktuell', pertinence: S },                // liquide clair ou sang par le nez, l'oreille
  attackenverhalten: { kapitel: 'aktuell', pertinence: S },         // pendant la crise : au calme dans le noir, ou agité
  kurzzeitgedaechtnis: { kapitel: 'aktuell', pertinence: S },       // oublie le récent ou l'ancien
  orientierung_raum: { kapitel: 'aktuell', pertinence: S },         // s'est-il perdu sur un trajet connu
  orientierung_zeit: { kapitel: 'aktuell', pertinence: S },         // jour, date
  alltag_haushalt: { kapitel: 'aktuell', pertinence: S },           // cuisine-t-il encore, plaque restée allumée
  alltag_finanzen: { kapitel: 'aktuell', pertinence: S },           // qui gère banque et factures
  hilfsmittel: { kapitel: 'aktuell', pertinence: S },               // lunettes, appareil auditif sur lui
  angstinhalt: { kapitel: 'aktuell', pertinence: S },               // ce qu'il craint pendant la crise
  erwartungsangst: { kapitel: 'aktuell', pertinence: S },           // peur de la prochaine crise, contrôle du pouls
  vermeidung: { kapitel: 'aktuell', pertinence: S },                // ce qu'il évite depuis
  intrusionen: { kapitel: 'aktuell', pertinence: S },               // souvenirs qui s'imposent, cauchemars
  uebererregung: { kapitel: 'aktuell', pertinence: S },             // sursaute, toujours sur ses gardes
  entfremdung: { kapitel: 'aktuell', pertinence: S },               // coupé des autres, de ses émotions
  verfolgungswahn: { kapitel: 'aktuell', pertinence: S },           // se sent observé, comment il le remarque
  beziehungswahn: { kapitel: 'aktuell', pertinence: S },            // la radio, la télé parlent de lui
  halluzinationen: { kapitel: 'aktuell', pertinence: S },           // voit ou entend ce qui n'est pas là
  imperative_stimmen: { kapitel: 'aktuell', pertinence: S },        // les voix ordonnent (y compris de nuire)
  ich_stoerung: { kapitel: 'aktuell', pertinence: S },              // pensées imposées, retirées, lues
  fremdbeeinflussung: { kapitel: 'aktuell', pertinence: S },        // piloté de l'extérieur
  gewichtsphobie: { kapitel: 'aktuell', pertinence: S },            // peur de grossir
  koerperbild: { kapitel: 'aktuell', pertinence: S },               // ce qu'elle voit dans le miroir
  selbstinduziertes_erbrechen: { kapitel: 'aktuell', pertinence: S },   // se fait-elle vomir (≠ `uebelkeit`)
  diaet: { kapitel: 'aktuell', pertinence: S },                     // aliments qu'il évite de lui-même
  essalltag: { kapitel: 'aktuell', pertinence: S },                 // ce qu'il mange une journée ordinaire
  bewegung_alltag: { kapitel: 'aktuell', pertinence: S },           // activité physique, heures assises
  sport: { kapitel: 'aktuell', pertinence: S },                     // a-t-il repris le sport pendant l'infection
  koffein: { kapitel: 'aktuell', pertinence: S },                   // café, thé, cola, boissons énergisantes
  salzkonsum: { kapitel: 'aktuell', pertinence: S },                // mange-t-il salé, repas récents
  jod_ernaehrung: { kapitel: 'aktuell', pertinence: S },            // sel iodé, poisson de mer
  dosisabhaengigkeit: { kapitel: 'aktuell', pertinence: S },        // dépend de la quantité (un peu de lait, un verre)
  nahrungsmittelallergie: { kapitel: 'aktuell', pertinence: S },    // réaction allergique à un aliment (≠ `allergie` médicamenteuse)
  zyklusbezug: { kapitel: 'aktuell', pertinence: S },               // la douleur suit-elle le cycle
  krankheitskonzept: { kapitel: 'aktuell', pertinence: S },         // ce qu'il pense avoir, ce qu'il attend
  vorbefunde: { kapitel: 'aktuell', pertinence: S },                // examens déjà faits et leurs résultats
  coronatest: { kapitel: 'aktuell', pertinence: S },                // comment et quand il s'est testé
  augenkontrolle: { kapitel: 'aktuell', pertinence: S },            // suivi ophtalmologique et ses conclusions
  blutgruppe: { kapitel: 'aktuell', pertinence: S },                // groupe sanguin, rhésus
  untersuchung_einverstaendnis: { kapitel: 'aktuell', pertinence: S },   // accord pour un examen (toucher rectal)
  naechtliche_anfaelle: { kapitel: 'aktuell', pertinence: S },      // crises qui surviennent la nuit, réveillent (épilepsie, panique) — passées, ≠ la crise actuelle
  anfallsformen: { kapitel: 'aktuell', pertinence: S },             // myoclonies matinales, absences (≠ `krampf`, la crise actuelle)
  aufenthalt: { kapitel: 'aktuell', pertinence: S },                // où et comment il a vécu sur place (ville, campagne, logement) — après le voyage
  blutungsquelle: { kapitel: 'aktuell', pertinence: S },            // le sang : rouge vif sur le papier ou mêlé aux selles (le sang déjà dit)
  herzrasen_frueher: { kapitel: 'aktuell', pertinence: S },         // ces palpitations, les connaît-il d'avant
  // --- K4 fixeur (revue clinique, décisions de main) -------------------------------
  todeswunsch: { kapitel: 'aktuell', pertinence: S },               // désir de mort passif (« lieber nicht mehr da sein ») — RISIKO_SIGNES, premier degré avant idées, plan, intention
  schulterschmerz: { kapitel: 'aktuell', pertinence: S },           // douleur de l'épaule / sous les côtes à droite (Fitz-Hugh-Curtis) ≠ `ausstrahlung`, la question ouverte d'irradiation (contre-revue P2)
  haematurie: { kapitel: 'aktuell', pertinence: S },                // sang dans les urines (≠ l'aspect des urines : mousse, trouble, couleur)
  beschwerdefreies_intervall: { kapitel: 'aktuell', pertinence: S },   // entre les crises, sans aucune gêne (≠ le cours : fréquence, aggravation)
  flug: { kapitel: 'aktuell', pertinence: S },                      // le vol : quand par rapport aux troubles, combien de temps (≠ l'immobilisation en général)
  peau_orange: { kapitel: 'aktuell', pertinence: S },               // sein rouge, chaud, en peau d'orange (≠ douleur, écoulement du mamelon)
  blutungsstaerke: { kapitel: 'aktuell', pertinence: S },           // abondance et durée des règles (≠ le changement : intermenstruel, post-coïtal)
  seite_lagerung: { kapitel: 'aktuell', pertinence: S },            // le côté qui déclenche (en se tournant au lit) — après la question de position
  stuhlgewohnheit: { kapitel: 'aktuell', pertinence: S },           // les selles ont-elles changé ces derniers mois (≠ « Stuhlgang heute? »)
  // --- Vegetative Anamnese -----------------------------------------------------
  schnarchen: { kapitel: 'vegetativ', pertinence: S },              // ronfle-t-il, régulièrement ou non (≠ `schlafapnoe`, les pauses)
  tagesschlaefrigkeit: { kapitel: 'vegetativ', pertinence: S },     // s'endort malgré lui le jour (≠ `muedigkeit`)
  traumschlaf: { kapitel: 'vegetativ', pertinence: S },             // vit ses rêves la nuit (trouble du sommeil paradoxal)
  haematemesis: { kapitel: 'vegetativ', pertinence: S },            // a-t-il vomi du sang
  zuckergetraenke: { kapitel: 'vegetativ', pertinence: S },         // boissons sucrées
  // --- Vorerkrankungen : antécédents ciblés ------------------------------------
  herz_vorgeschichte: { kapitel: 'vorerkrankungen', pertinence: S },          // cardiopathie connue : coronarographie, stent, valve, rythme
  tia_vorgeschichte: { kapitel: 'vorerkrankungen', pertinence: S },           // déficit transitoire passé
  neuro_vorgeschichte: { kapitel: 'vorerkrankungen', pertinence: S },         // convulsions fébriles, méningite, traumatisme crânien
  lungen_vorgeschichte: { kapitel: 'vorerkrankungen', pertinence: S },        // maladie pulmonaire connue
  exazerbationen: { kapitel: 'vorerkrankungen', pertinence: S },              // poussées de l'année, leur traitement
  magen_vorgeschichte: { kapitel: 'vorerkrankungen', pertinence: S },         // gastrite chronique, Helicobacter
  darm_vorgeschichte: { kapitel: 'vorerkrankungen', pertinence: S },          // diverticules, maladie intestinale connue
  pankreas_vorgeschichte: { kapitel: 'vorerkrankungen', pertinence: S },      // pancréatite antérieure
  diabetes_bekannt: { kapitel: 'vorerkrankungen', pertinence: S },            // un diabète est-il connu
  diabetes_einstellung: { kapitel: 'vorerkrankungen', pertinence: S },        // équilibre et suivi du diabète (HbA1c, contrôles)
  schilddruese_bekannt: { kapitel: 'vorerkrankungen', pertinence: S },        // une maladie thyroïdienne est-elle connue
  schilddruesen_vorgeschichte: { kapitel: 'vorerkrankungen', pertinence: S }, // chirurgie, iode radioactif, irradiation de la thyroïde
  bestrahlung_hals: { kapitel: 'vorerkrankungen', pertinence: S },            // irradiation cervicale dans l'enfance
  anaemie_vorgeschichte: { kapitel: 'vorerkrankungen', pertinence: S },       // anémie, carence martiale connues
  blutbild_frueher: { kapitel: 'vorerkrankungen', pertinence: S },            // numération déjà anormale
  blutungs_vorgeschichte: { kapitel: 'vorerkrankungen', pertinence: S },      // hémorragie passée (digestive, urinaire, ulcère)
  fraktur_vorgeschichte: { kapitel: 'vorerkrankungen', pertinence: S },       // fracture sur traumatisme minime
  osteoporose_diagnostik: { kapitel: 'vorerkrankungen', pertinence: S },      // ostéoporose connue, densitométrie
  koerpergroesse_verlust: { kapitel: 'vorerkrankungen', pertinence: S },      // a-t-il rapetissé, dos voûté
  sturz_vorgeschichte: { kapitel: 'vorerkrankungen', pertinence: S },         // chutes dans l'année
  gelenkpunktion: { kapitel: 'vorerkrankungen', pertinence: S },              // infiltration, ponction, chirurgie de l'articulation
  harnverhalt: { kapitel: 'vorerkrankungen', pertinence: S },                 // rétention urinaire, sonde vésicale
  harnwegs_eingriff: { kapitel: 'vorerkrankungen', pertinence: S },           // sondage ou examen urologique récent
  haematospermie: { kapitel: 'vorerkrankungen', pertinence: S },              // sang dans le sperme
  hernie: { kapitel: 'vorerkrankungen', pertinence: S },                      // voussure de l'aine, de l'ombilic, d'une cicatrice
  eug_vorgeschichte: { kapitel: 'vorerkrankungen', pertinence: S },           // grossesse extra-utérine antérieure
  brust_vorgeschichte: { kapitel: 'vorerkrankungen', pertinence: S },         // traumatisme, chirurgie, irradiation du sein
  tonsillen_vorgeschichte: { kapitel: 'vorerkrankungen', pertinence: S },     // amygdalectomie, angines de l'année
  kognition_vorher: { kapitel: 'vorerkrankungen', pertinence: S },            // troubles cognitifs avant l'épisode (delir, rétabli par la revue Q7 P2-2)
  hodenhochstand: { kapitel: 'vorerkrankungen', pertinence: S },              // cryptorchidie dans l'enfance (Q7 : « Hodenhochstand hatte ich keinen », hodentorsion)
  windpocken: { kapitel: 'vorerkrankungen', pertinence: S },                  // varicelle dans l'enfance
  manie_vorgeschichte: { kapitel: 'vorerkrankungen', pertinence: S },         // phases euphoriques, hyperactives
  entzug_vorgeschichte: { kapitel: 'vorerkrankungen', pertinence: S },        // crise convulsive, délire lors d'un sevrage
  rheuma_vorgeschichte: { kapitel: 'vorerkrankungen', pertinence: S },        // maladie rhumatismale connue
  dermato_eingriff: { kapitel: 'vorerkrankungen', pertinence: S },            // lésion cutanée déjà enlevée, cryothérapie
  splenektomie: { kapitel: 'vorerkrankungen', pertinence: S },                // rate enlevée
  asplenie_impfung: { kapitel: 'vorerkrankungen', pertinence: S },            // sans rate : pneumocoque, méningocoque, carte d'asplénie (≠ le statut vaccinal général)
  abnehmversuche: { kapitel: 'vorerkrankungen', pertinence: S },              // tentatives de perdre du poids
  kompression: { kapitel: 'vorerkrankungen', pertinence: S },                 // bas de contention prescrits, portés
  // --- Medikamente : expositions ciblées ----------------------------------------
  nsar: { kapitel: 'medikamente', pertinence: S },                  // anti-inflammatoires (ibuprofène, diclofénac, aspirine), à quelle fréquence
  magenschutz: { kapitel: 'medikamente', pertinence: S },           // protecteur gastrique, IPP au long cours
  schmerzmittel_frequenz: { kapitel: 'medikamente', pertinence: S },   // jours d'antalgiques par mois
  antibiotika: { kapitel: 'medikamente', pertinence: S },           // antibiotique récent
  kontrastmittel: { kapitel: 'medikamente', pertinence: S },        // produit de contraste iodé récent
  jodzufuhr: { kapitel: 'medikamente', pertinence: S },             // comprimés d'iode, médicaments iodés, amiodarone
  schilddruesenhormone: { kapitel: 'medikamente', pertinence: S },  // hormones thyroïdiennes, coupe-faim, comprimés d'un proche
  schilddruesen_noxen: { kapitel: 'medikamente', pertinence: S },   // amiodarone, lithium, interféron
  insulinbedarf: { kapitel: 'medikamente', pertinence: S },         // besoins en insuline ou en antidiabétiques modifiés
  metformin: { kapitel: 'medikamente', pertinence: S },             // metformine au long cours
  statin: { kapitel: 'medikamente', pertinence: S },                // hypolipémiant (statine)
  immunsuppression: { kapitel: 'medikamente', pertinence: S },      // immunosuppresseurs, traitement de fond du rhumatisme
  kortisonstoss: { kapitel: 'medikamente', pertinence: S },         // bolus de cortisone en plus du traitement quotidien
  diuretika: { kapitel: 'medikamente', pertinence: S },             // diurétique
  antihypertensiva: { kapitel: 'medikamente', pertinence: S },      // antihypertenseurs (IEC, bêtabloquants)
  anticholinergika: { kapitel: 'medikamente', pertinence: S },      // décongestionnant, antirhume, antiallergique, sédatif
  sedativa: { kapitel: 'medikamente', pertinence: S },              // somnifères, tranquillisants (prise, arrêt)
  neuroleptika: { kapitel: 'medikamente', pertinence: S },          // antiémétiques et neuroleptiques (MCP)
  psychopharmaka: { kapitel: 'medikamente', pertinence: S },        // psychotropes qui font grossir
  agranulozytose_risiko: { kapitel: 'medikamente', pertinence: S }, // métamizole, antithyroïdien, psychotrope
  thromboseprophylaxe: { kapitel: 'medikamente', pertinence: S },   // injections d'héparine
  injektion: { kapitel: 'medikamente', pertinence: S },             // injection récente : où, pourquoi
  nasenspray: { kapitel: 'medikamente', pertinence: S },            // spray nasal décongestionnant : lequel, depuis quand
  malariaprophylaxe: { kapitel: 'medikamente', pertinence: S },     // chimioprophylaxie antipaludique
  lakritz: { kapitel: 'medikamente', pertinence: S },               // réglisse
  adhaerenz: { kapitel: 'medikamente', pertinence: S },             // prend-il ses comprimés comme prescrits
  medikament_neu: { kapitel: 'medikamente', pertinence: S },        // médicament récemment introduit ou modifié
  medikament_indikation: { kapitel: 'medikamente', pertinence: S }, // pourquoi et par qui ce médicament a été prescrit
  inhalationstechnik: { kapitel: 'medikamente', pertinence: S },    // usage réel du spray, technique
  dosissteigerung: { kapitel: 'medikamente', pertinence: S },       // dose réellement prise, son évolution
  applikationsweg: { kapitel: 'medikamente', pertinence: S },       // croqué, sniffé, injecté
  ueberdosis: { kapitel: 'medikamente', pertinence: S },            // surdosage, appel des secours
  craving: { kapitel: 'medikamente', pertinence: S },               // envie impérieuse, perte de contrôle
  // --- Allergien -----------------------------------------------------------------
  allergie_reaktion: { kapitel: 'allergien', pertinence: S },       // la réaction à une allergie déjà nommée : quoi, quand, traitée comment (≠ `allergie`, la liste)
  nasenpolypen: { kapitel: 'allergien', pertinence: S },            // polypes, chirurgie des sinus
  notfallset: { kapitel: 'allergien', pertinence: S },              // stylo d'adrénaline, carte d'allergie
  // --- Noxen ---------------------------------------------------------------------
  alkohol_dauer: { kapitel: 'noxen', pertinence: S },               // depuis combien d'années il boit autant
  alkohol_akut: { kapitel: 'noxen', pertinence: S },                // alcool des derniers jours, du soir, avec les comprimés
  letzte_einnahme: { kapitel: 'noxen', pertinence: S },             // dernière prise (alcool, comprimé) : jour, heure
  entzug: { kapitel: 'noxen', pertinence: S },                      // signes de manque, tentatives d'arrêt
  rauchstopp: { kapitel: 'noxen', pertinence: S },                  // arrêt récent du tabac
  // --- Familien- & Sozialanamnese ------------------------------------------------
  familie_herz: { kapitel: 'familie-sozial', pertinence: S },       // infarctus précoce, mort subite, cardiomyopathie dans la famille
  familie_gefaess: { kapitel: 'familie-sozial', pertinence: S },    // anévrisme, maladie du tissu conjonctif dans la famille
  familie_darm: { kapitel: 'familie-sozial', pertinence: S },       // maladie inflammatoire de l'intestin dans la famille
  familie_gerinnung: { kapitel: 'familie-sozial', pertinence: S },  // trouble de la coagulation connu dans la famille (lungenembolie, revue Q7 P2-6)
  familie_autoimmun: { kapitel: 'familie-sozial', pertinence: S },  // vitiligo, maladie cœliaque, auto-immunité dans la famille
  familie_aehnlich: { kapitel: 'familie-sozial', pertinence: S },   // la même maladie, les mêmes troubles dans la famille
  sexualkontakt: { kapitel: 'familie-sozial', pertinence: S },      // rapport récent, nouveau partenaire (déclencheur) ≠ l'entrée en matière de la Sexualanamnese, qui reste
  trinkmenge: { kapitel: 'familie-sozial', pertinence: S },         // combien il boit par jour
  miktion_aufschub: { kapitel: 'familie-sozial', pertinence: S },   // peut-elle aller aux toilettes au travail
  berufliche_belastung: { kapitel: 'familie-sozial', pertinence: S },   // charge physique du travail (port, gestes répétés)
  lebensbelastung: { kapitel: 'familie-sozial', pertinence: S },    // ce qui pèse dans sa vie (famille, aidant, ruptures)
  sozialrecht: { kapitel: 'familie-sozial', pertinence: S },        // procédure de rente, ce qu'elle représente
  hilfe_zuhause: { kapitel: 'familie-sozial', pertinence: S },      // qui l'aide, qui le surveille
  vorsorgevollmacht: { kapitel: 'familie-sozial', pertinence: S },  // niveau de dépendance, mandat, directives anticipées
  vorzustand: { kapitel: 'familie-sozial', pertinence: S },         // autonomie avant l'épisode
  wohnung_sturzrisiko: { kapitel: 'familie-sozial', pertinence: S },    // escaliers, rampe, tapis, lumière
  sehvermoegen: { kapitel: 'familie-sozial', pertinence: S },       // voit-il bien (pénombre)
  gefaehrdung: { kapitel: 'familie-sozial', pertinence: S },        // conduite, échelle, machines : danger pour lui et les autres
  risikopersonen: { kapitel: 'familie-sozial', pertinence: S },     // nourrisson, femme enceinte, fragile dans son entourage
  passivrauchen: { kapitel: 'familie-sozial', pertinence: S },      // fume-t-on chez lui
  mueckenschutz: { kapitel: 'familie-sozial', pertinence: S },      // moustiquaire, répulsif, dehors le soir (≠ la piqûre elle-même)
  uv_exposition: { kapitel: 'familie-sozial', pertinence: S },      // années au soleil, protection, coups de soleil
  strahlenexposition: { kapitel: 'familie-sozial', pertinence: S }, // radiothérapie, exposition professionnelle aux radiations
  taetowierung: { kapitel: 'familie-sozial', pertinence: S },       // tatouage, piercing
  tauchen: { kapitel: 'familie-sozial', pertinence: S },            // plongée
  // --- Frauenanamnese ------------------------------------------------------------
  // Q-gyn : une sonde de la Frauenanamnese n'est jamais perdue — une question du cas qui la prolonge a son signe à elle.
  schwangerschaftstest: { kapitel: 'frauenanamnese', pertinence: S },   // test de grossesse fait (après « schwanger möglich ? »)
  menarche: { kapitel: 'frauenanamnese', pertinence: S },           // âge des premières règles
  stillen: { kapitel: 'frauenanamnese', pertinence: S },            // allaitement
} satisfies Record<string, SigneDefBody>;

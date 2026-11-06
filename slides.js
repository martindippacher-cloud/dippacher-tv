// ===== FOLIEN – hier Inhalte ändern =====
// Felder: typ, titel, text, bild (Hintergrund), qr, link, dauer (Sek.),
// zeit: {von:"11:00", bis:"14:00"} = nur in diesem Zeitfenster zeigen (optional)
// tage: [1..7] Mo=1 … So=7 (optional), aktiv:false = ausblenden
window.FOLIEN = [
 {titel:"Herzlich willkommen", unter:"in der Gaststätte Dippacher", text:"Fränkische Gastlichkeit in Poppendorf – schön, dass Sie da sind!", bild:"assets/schaueferla_9731Lr.jpg"},
 {titel:"Mittagstisch heute", badge:"BEISPIEL", zeit:{von:"10:00",bis:"14:30"},
  liste:[["Fränkisches Schäufele mit Kloß","Beispiel €"],["Schweinebraten mit Wirsing","Beispiel €"],["Tagessuppe","Beispiel €"]], text:"Testfolie – erscheint nur mittags (10:00–14:30)"},
 {titel:"Das perfekte Weihnachtsgeschenk", unter:"Gutscheine der Gaststätte Dippacher", text:"Als Karte vor Ort oder bequem online kaufen", qr:"assets/qr_gutschein.png", link:"www.dippacher.de/gutscheine.html", bild:"assets/gutscheinkartedippacher.jpg"},
 {titel:"Food-Box Automat", unter:"24 Stunden · 7 Tage", text:"Fränkische Spezialitäten zum Mitnehmen – rund um die Uhr", qr:"assets/qr_foodbox.png", link:"www.dippacher.de/food-box.html", bild:"assets/food-box-24.7.jpg"},
 {titel:"Fränkische Klöße", unter:"Auch für zu Hause", text:"Gerollte Klöße und Kloßteig von Schmitt – rund um die Uhr im Food-Box Automaten", bild:"assets/kloesse.jpg"},
 {titel:"Tisch reservieren", unter:"Ganz einfach online", text:"Für Familienfeiern, Stammtisch oder den nächsten Besuch", qr:"assets/qr_reservierung.png", link:"www.dippacher.de"},
 {titel:"Öffnungszeiten Dezember", badge:"BEISPIEL", liste:[["24.12. Heiligabend","Beispiel: geschlossen"],["25./26.12. Weihnachten","Beispiel: geöffnet"],["31.12. Silvester","Beispiel: bis 14 Uhr"],["01.01. Neujahr","Beispiel: geschlossen"]], text:"Platzhalter – echte Zeiten folgen"},
 {titel:"Schönen Abend!", unter:"Fragen Sie nach unseren Aktionen", text:"Testfolie – erscheint nur abends ab 17:00", zeit:{von:"17:00",bis:"23:59"}}
];

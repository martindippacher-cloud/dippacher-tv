// ===== FOLIEN – hier Inhalte ändern =====
// Felder: typ, titel, text, bild (Hintergrund), qr/logo, link, dauer (Sek.),
// zeit: {von:"11:00", bis:"14:00"} = nur in diesem Zeitfenster zeigen (optional)
// datum: "YYYY-MM-DD" = nur an diesem Kalendertag (Europe/Berlin, optional)
// tage: [1..7] Mo=1 … So=7 (optional), aktiv:false = ausblenden
// typ:"bestand" + dataUrl = Live-Bestand aus inventory.json
window.FOLIEN = [
 {titel:"Herzlich willkommen", unter:"Stadtwerke Forchheim",
  text:"Schön, dass Sie da sind!<br>Wir wünschen eine schöne Weihnachtsfeier.",
  bild:"assets/stadtwerke_forchheim_bg.jpg",
  logo:"assets/stadtwerke_forchheim_logo.png",
  datum:"2026-11-06"},
 {titel:"Herzlich willkommen", unter:"in der Gaststätte Dippacher", text:"Fränkische Gastlichkeit in Poppendorf – schön, dass Sie da sind!", bild:"assets/schaueferla_9731Lr.jpg"},
 {titel:"Mittagstisch heute", badge:"BEISPIEL", zeit:{von:"10:00",bis:"14:30"},
  liste:[["Fränkisches Schäufele mit Kloß","Beispiel €"],["Schweinebraten mit Wirsing","Beispiel €"],["Tagessuppe","Beispiel €"]], text:"Testfolie – erscheint nur mittags (10:00–14:30)"},
 {titel:"Das perfekte Weihnachtsgeschenk", unter:"Gutscheine der Gaststätte Dippacher", text:"Als Karte vor Ort oder bequem online kaufen", qr:"assets/qr_gutschein.png", link:"www.dippacher.de/gutscheine.html", bild:"assets/gutscheinkartedippacher.jpg"},
 {titel:"Weihnachtsessen vorbestellen", unter:"Abholung am 23. Dezember", klasse:"kompakt",
  liste:[["Sauerbraten","10,50 €"],["Kalbsrahmbraten","11,00 €"],["Rinderrouladen","12,50 €"],["Blaukraut","3,00 €"],["Wirsing","4,90 €"]],
  text:"Bestellen bis Do, 17.12., 20 Uhr · online oder vor Ort<br>Telefon/WhatsApp 09190&nbsp;1807",
  qr:"assets/qr_weihnachten.png", link:"www.dippacher.de/weihnachten.html"},
 {titel:"Food-Box Automat", unter:"24 Stunden · 7 Tage", text:"Fränkische Spezialitäten zum Mitnehmen – rund um die Uhr", qr:"assets/qr_foodbox.png", link:"www.dippacher.de/food-box.html", bild:"assets/food-box-24.7.jpg"},
 {typ:"bestand", titel:"Live-Bestand Food-Box Automat", unter:"Aktuell im Automaten",
  dataUrl:"https://martindippacher-cloud.github.io/automat-bestand/inventory.json", dauer:20},
 {titel:"Fränkische Klöße", unter:"Auch für zu Hause", text:"Gerollte Klöße und Kloßteig von Schmitt – rund um die Uhr im Food-Box Automaten", bild:"assets/kloesse.jpg"},
 {titel:"Tisch reservieren", unter:"Ganz einfach online", text:"Für Familienfeiern, Stammtisch oder den nächsten Besuch", qr:"assets/qr_reservierung.png", link:"www.dippacher.de"},
 {titel:"Öffnungszeiten Dezember",
  liste:[["Familienfeier Do 10. – So 13. Dez.","geschlossen"],
         ["Wieder da","ab Do 17. Dezember"],
         ["Betriebsurlaub Mo 21. Dez. – Mi 6. Jan.","geschlossen"],
         ["Wieder da","ab Do 7. Januar 2027"],
         ["Mi 23. Dezember nur Abholung","15–18 Uhr"]],
  text:"Über Weihnachten, Silvester und Neujahr geschlossen (Betriebsurlaub)."},
 {titel:"Schönen Abend!", unter:"Fragen Sie nach unseren Aktionen", text:"Testfolie – erscheint nur abends ab 17:00", zeit:{von:"17:00",bis:"23:59"}}
];

# HexGrid Empires - Project Architectuur & AI Richtlijnen

Dit document dient als leidraad voor de AI-assistent die aan dit project werkt. Het doel is om consistentie te waarborgen, de ontwikkelingssnelheid te verhogen en de stabiliteit van de applicatie te garanderen bij elke wijziging.

## Kernprincipes van de Architectuur

Na een significante refactoring volgt het project nu een moderne, schaalbare architectuur. Houd u bij alle wijzigingen aan de volgende principes:

1.  **State Management met Zustand:**
    *   De *single source of truth* voor de volledige `gameState` bevindt zich in de Zustand store (`store/gameStore.ts`).
    *   Alle wijzigingen in de `gameState` moeten worden uitgevoerd via acties die in deze store zijn gedefinieerd (bv. `endTurn`, `hexClick`).
    *   Componenten halen hun state en acties rechtstreeks uit de store met de `useGameStore` hook. Prop-drilling van de `gameState` is niet toegestaan.

2.  **Strikte Scheiding van Logica en UI:**
    *   Alle kernlogica van het spel (turn-processing, combat, resource-berekeningen, etc.) bevindt zich in `utils/gameLogic.ts`.
    *   Deze logica is geïmplementeerd als **pure functies**. Ze ontvangen de state als input en retourneren een *nieuwe, gewijzigde* state, zonder de originele state te muteren (`side effects`).
    *   De acties in de Zustand store roepen deze pure functies aan om de state te updaten.

3.  **Componenten zijn voor de UI:**
    *   React-componenten in de `components/` map zijn primair verantwoordelijk voor het weergeven van de UI.
    *   Ze halen data uit de Zustand store en roepen acties uit de store aan als reactie op gebruikersinteractie.
    *   Complexe logica hoort niet thuis in de componenten. `App.tsx` is de hoofd-layout-component die de verschillende UI-delen samenbrengt.

4.  **Types en Constanten:**
    *   Alle datastructuren en enums zijn gedefinieerd in `types.ts`.
    *   Alle spelconstanten (zoals `HEX_SIZE`, `UNIT_DEFINITIONS`, etc.) staan in `constants.ts`.

---

## Gouden Regel voor AI-ontwikkeling

**Behoud van Functionaliteit is Prioriteit #1.**

Bij elke aanvraag om de code aan te passen, geldt de volgende, allerbelangrijkste regel:

*   **Wijzig alléén wat expliciet wordt gevraagd.**
*   **Behoud altijd alle bestaande functionaliteit die buiten de scope van de opdracht valt.** Raak geen code aan die niet direct met de opdracht te maken heeft.
*   **Los fouten op zonder functionaliteit te verwijderen.** Als er een fout optreedt, los deze dan op met respect voor de bestaande features. Verwijder geen codeblokken als een "snelle oplossing" als dit betekent dat een menu, knop of spelmechanisme verdwijnt.
*   **Wees chirurgisch in je aanpassingen.** Maak minimale, doelgerichte wijzigingen om de opdracht uit te voeren.

Deze regel is cruciaal om onvoorspelbare wijzigingen te voorkomen en ervoor te zorgen dat het spel stabiel blijft.

## Bestandsstructuur Overzicht

```
/
├── components/     # Alle React UI componenten
├── store/          # Zustand store voor state management
├── utils/          # Hulpfuncties en de kern game-logica
├── App.tsx         # Hoofdcomponent, layout en setup
├── constants.ts    # Spelconstanten
├── types.ts        # TypeScript types en interfaces
├── index.tsx       # Entry point van de React applicatie
└── README.md       # DIT BESTAND
```

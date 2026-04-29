(async function extractAllBetHistory() {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  const text = (el) => el ? el.textContent.trim().replace(/\s+/g, ' ') : null;
  const parseNumber = (str) => {
    if (!str) return null;
    const cleaned = String(str).replace(/[R$\s]/g, '').replace(/\./g, '').replace(',', '.');
    const m = cleaned.match(/-?\d+(?:\.\d+)?/);
    return m ? parseFloat(m[0]) : null;
  };

  // 1) Achar e clicar no botão "Mais" / "Carregar mais" até sumir ou parar de aumentar
  const findMoreButton = () => {
    const candidates = Array.from(document.querySelectorAll('button, div, a, span'));
    return candidates.find(el => {
      const t = (el.textContent || '').trim().toLowerCase();
      if (!t || t.length > 30) return false;
      if (!/^(mais|carregar mais|ver mais|mostrar mais|more|load more)$/i.test(t)) return false;
      // precisa estar visível
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0;
    });
  };

  let prevCount = -1;
  let stableRounds = 0;
  const maxClicks = 200;

  for (let i = 0; i < maxClicks; i++) {
    const currentCount = document.querySelectorAll('.h-BetSummary').length;
    console.log(`Iteração ${i}: ${currentCount} apostas`);

    if (currentCount === prevCount) {
      stableRounds++;
      if (stableRounds >= 3) break; // 3 tentativas sem mudança = acabou
    } else {
      stableRounds = 0;
    }
    prevCount = currentCount;

    const btn = findMoreButton();
    if (!btn) {
      console.log('Botão "Mais" não encontrado — provavelmente carregou tudo.');
      break;
    }

    btn.scrollIntoView({ block: 'center' });
    btn.click();
    await sleep(1500); // espera carregar
  }

  // Espera final pra garantir
  await sleep(1000);

  // 2) Extrair
  const q = (root, sel) => root.querySelector(sel);
  const qa = (root, sel) => Array.from(root.querySelectorAll(sel));
  const betNodes = document.querySelectorAll('.h-BetSummary');
  console.log(`Total final: ${betNodes.length} apostas. Extraindo...`);

  const bets = [];
  betNodes.forEach((node, idx) => {
    const dateTime = text(q(node, '.h-BetSummary_DateAndTime'));
    const stakeText = text(q(node, '.h-StakeReturnSection_StakeContainer'));
    const returnText = text(q(node, '.h-StakeReturnSection_ReturnContainer'));
    const betDetails = text(q(node, '.h-BetSummary_BetDetailsText')) || text(q(node, '.h-BetSummary_BetDetails'));
    const stakeDescription = text(q(node, '.h-StakeDescription_Text'));

    const cls = node.outerHTML.toLowerCase();
    let status = null;
    if (/won|win|ganh|verde/.test(cls)) status = 'won';
    else if (/lost|lose|perd|vermelh/.test(cls)) status = 'lost';
    else if (/cash/.test(cls)) status = 'cashout';
    else if (/open|pend/.test(cls)) status = 'open';

    const simpleSels = qa(node, '.h-BetSelection').map(s => ({
      kind: 'single',
      name: text(q(s, '.h-BetSelection_Name')),
      odds: text(q(s, '.h-BetSelection_Odds')),
      info: text(q(s, '.h-BetSelection_InfoContainer')),
      raw: text(s)
    }));

    const bbSels = qa(node, '.h-BetBuilderSelection').map(s => ({
      kind: 'bet_builder_leg',
      label: text(q(s, '.h-BetBuilderSelection_SelectionLabel')),
      description: text(q(s, '.h-BetBuilderSelection_Description')),
      raw: text(s)
    }));

    const bbGroups = qa(node, '.h-BetBuilderMultipleSelections').map(g => ({
      kind: 'bet_builder_group',
      odds: text(q(g, '.h-BetBuilderMultipleSelections_OddsLabel')),
      fixture: text(q(g, '.h-BetBuilderMultipleSelections_FixtureLabel')),
      legs: qa(g, '.h-BetBuilderSelection').map(s => ({
        label: text(q(s, '.h-BetBuilderSelection_SelectionLabel')),
        description: text(q(s, '.h-BetBuilderSelection_Description'))
      }))
    }));

    bets.push({
      index: idx,
      placedAt: dateTime,
      betType: betDetails,
      stakeDescription,
      stake: parseNumber(stakeText),
      stakeText,
      returns: parseNumber(returnText),
      returnsText: returnText,
      status,
      selections: simpleSels,
      betBuilderLegs: bbSels,
      betBuilderGroups: bbGroups,
      rawText: node.innerText.trim().replace(/\n+/g, ' | ')
    });
  });

  const payload = {
    extractedAt: new Date().toISOString(),
    source: location.href,
    totalBets: bets.length,
    bets
  };

  console.log('Concluído:', payload);

  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `bet365_historico_${Date.now()}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);

  return payload;
})();

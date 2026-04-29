# Scripts de Scraper

Repositório com scripts para automação de extração de dados.

## Bet365 — Histórico de Apostas

Extrai automaticamente o histórico de apostas da Bet365 sem precisar clicar manualmente.

### Como usar

1. Faça login na Bet365 e abra a página de histórico de apostas.
2. Abra o **Console do navegador** (`F12` → aba *Console*).
3. Cole o snippet abaixo e pressione `Enter`:

```javascript
(async () => {
  const SCRIPT_URL = 'https://raw.githubusercontent.com/Fatdog1900/ScraperScripts/refs/heads/main/download_betting_history.js';
  try {
    const code = await (await fetch(SCRIPT_URL, { cache: 'no-store' })).text();
    // (0, eval) executa no escopo global em vez do escopo da função anônima
    (0, eval)(code);
    await window.bet365Extractor();
  } catch (e) {
    console.error('Falha ao carregar/executar:', e);
  }
})();
```

O download do arquivo com as apostas inicia automaticamente ao final.

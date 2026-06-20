// ==========================================================================
// GOOGLE APES SCRIPT — CODIGO UNIFICADO E COMPLETO DO EMPIRE BOT
// Copie esse conteudo inteiro e cole no seu editor do Google Apps Script.
// ==========================================================================

// ==========================================
// 1_config.gs — CONFIGURAÇÕES
// ==========================================

// BOT
const BOT_TOKEN = '8662083027:AAE9xsTnQwk-WX9gbXWyPQngdiGomnTnSBk'; // Seu token do bot

// IDs dos grupos Telegram
const CHAT_ID        = '-1002072336495';   // grupo de músicas
const CHAT_ID_VIDEOS = '-1002092995685';   // grupo de vídeos
const CHAT_ID_ALBUNS = '-1002057001613';   // grupo de álbuns

// IDs dos arquivos JSON no Drive (exportação do histórico do Telegram)
const ID_ARQUIVO_DRIVE        = '1WOtn54jmmCLwKBHOteJu0cKVkGCJgmBu'; // JSON de músicas
const ID_ARQUIVO_DRIVE_VIDEOS = 'SEU_JSON_VIDEOS_DRIVE_ID';           // JSON de vídeos
const ID_ARQUIVO_DRIVE_ALBUNS = 'SEU_JSON_ALBUNS_DRIVE_ID';           // JSON de álbuns

// Planilha de Charts (EDIÇÃO CHARTS / EDIÇÃO CHARTS ÁLBUMS / etc.)
const EXT_SPREADSHEET_ID = '1GPajSCp1TkJDEDOGZIrXxgZuNuRs7545buFntyDlpL8';

// Planilha de Registro de Comentários
const EXT_REGISTRO_COMENTARIOS_ID = '1wNbtP78MrtrOc2Jb1ejXcHVjqndR2Vm4-3EIVqa8aOg';

// Planilha de Jogadores (contém nomes OFF, aba Jogadores)
const EXT_JOGADORES_ID = '1zMqnIntj5vAlU4_V_s0xf5suPTtFcl61W9DC9j8LFfM';

// URL do Mini App (Telegram Web App)
const URL_MINI_APP = 'https://t.me/testeempire_bot/charts';

// — Aliases usados internamente —
const TOKEN_BOT_VIDEOS  = BOT_TOKEN;
const BOT_TOKEN_VIDEOS  = BOT_TOKEN;
const ID_GRUPO_VIDEOS   = CHAT_ID_VIDEOS;
const ID_GRUPO_ALBUNS   = CHAT_ID_ALBUNS;
const ID_PLAN_CHARTS    = EXT_SPREADSHEET_ID;
const ID_PLAN_ALBUNS    = EXT_SPREADSHEET_ID; 
const ID_PLAN_JOGADORES = EXT_JOGADORES_ID;
const ID_PLAN_REGISTRO  = EXT_REGISTRO_COMENTARIOS_ID;


// Função auxiliar de utilidade para ler/gravar de forma resiliente na planilha Músicas (Tracking)
function getAbaMusicas() {
  try {
    return SpreadsheetApp.openById('1zMqnIntj5vAlU4_V_s0xf5suPTtFcl61W9DC9j8LFfM').getSheetByName('Músicas');
  } catch (e) {
    try {
      return SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Músicas');
    } catch (err) {
      Logger.log('Erro ao obter a aba Músicas: ' + err.message);
      return null;
    }
  }
}


// ==========================================
// 9_webhook.gs — WEBHOOK PRINCIPAL (doPost / doGet)
// ==========================================

function doPost(e) {
  const ss  = SpreadsheetApp.getActiveSpreadsheet();
  const log = ss.getSheetByName('LOG_DEBUG') || ss.insertSheet('LOG_DEBUG');

  try {
    log.appendRow([new Date(), 'doPost iniciado']);
    const raw = JSON.parse(e.postData.contents);
    log.appendRow([new Date(), 'raw parseado', JSON.stringify(raw).substring(0, 500)]);

    const msg         = raw.message;
    const cb          = raw.callback_query;
    const webAppData  = msg && msg.web_app_data ? msg.web_app_data : null;
    const idChatAtual = String(msg ? msg.chat.id : (cb ? cb.message.chat.id : ''));
    const cbData      = cb ? cb.data : '';

    // ── MINI APP: sendData() legado ────────────────────────────────────────────
    if (webAppData) {
      log.appendRow([new Date(), 'web_app_data recebido no doPost', webAppData.data]);
      try {
        const body = JSON.parse(webAppData.data);
        processarGravacaoMusicaLocal(body);
      } catch (errJson) {
        log.appendRow([new Date(), 'Erro parse webAppData', errJson.message]);
      }
      return HtmlService.createHtmlOutput('OK');
    }

    // ── ROTA: ÁLBUNS ────────────────────────────────────────────────────
    if (idChatAtual === CHAT_ID_ALBUNS || cbData.startsWith('alb_')) {
      if (msg && msg.forum_topic_created) {
        const abaAlbuns = ss.getSheetByName('Álbuns') || ss.insertSheet('Álbuns');
        const nome      = msg.forum_topic_created.name;
        const idTopico  = String(msg.message_id);
        const idCriador = String(msg.from ? msg.from.id : '');
        abaAlbuns.appendRow([nome, idTopico, idCriador, '']);
         salvarCache(idCriador, idTopico, { titulo: nome, threadId: idTopico });
        iniciarFluxoAlbuns(idTopico, nome);
      }
      if (cb) processarCallbackQueryAlbuns(cb);
      if (msg && msg.text && !msg.forum_topic_created) {
        const tratado = processarTextoPuroAlbuns(msg);
        if (!tratado) verificarComentarioMetacriticAlbum(msg);
      }
      return HtmlService.createHtmlOutput('OK');
    }

    // ── ROTA: VÍDEOS ────────────────────────────────────────────────────
    if (idChatAtual === CHAT_ID_VIDEOS || cbData.startsWith('v_start_') || cbData === 'v_cancelar' || cbData.startsWith('v_like_')) {
      if (msg && msg.forum_topic_created) {
        const abaVideos = ss.getSheetByName('Vídeos') || ss.getSheetByName('Videos');
        const nome      = msg.forum_topic_created.name;
        const idTopico  = String(msg.message_id);
        const idCriador = String(msg.from ? msg.from.id : '');
        abaVideos.appendRow([nome, idTopico, idCriador]);
        iniciarFluxoVideos(idTopico, nome);
      }
      if (cb) processarCallbackQueryVideos(cb);
      if (msg && msg.text && !msg.forum_topic_created) verificarComentarioTerceiros(msg);
      return HtmlService.createHtmlOutput('OK');
    }

    // ── ROTA: MÚSICAS ───────────────────────────────────────────────────
    if (
      idChatAtual === CHAT_ID             ||
      cbData.startsWith('p1_')            || cbData.startsWith('p1b_')          ||
      cbData.startsWith('p2_')            || cbData.startsWith('p3_')           ||
      cbData.startsWith('p4_')            || cbData.startsWith('p5_')           ||
      cbData.startsWith('sub_mus_')       || cbData.startsWith('valer_coment_') ||
      cbData.startsWith('conf_')          || cbData.startsWith('meta_')
    ) {
      if (msg && msg.forum_topic_created) {
        const abaMus    = getAbaMusicas();
        const nome      = msg.forum_topic_created.name;
        const idTopico  = String(msg.message_id);
        const idCriador = String(msg.from ? msg.from.id : '');
        
        // Escreve uma linha estruturada: Título em A, ID do tópico em B, ID do criador do tópico em C, ID do tópico em D como padrão, e Coluna E vazia para o message_id do convite
        const novaLinha = [];
        novaLinha[0] = nome; // Col A (1)
        novaLinha[1] = idTopico; // Col B (2)
        novaLinha[2] = idCriador; // Col C (3) - ID do criador do tópico
        novaLinha[3] = idTopico; // Col D (4) - Inicialmente o mesmo ID do tópico por padrão
        novaLinha[4] = ''; // Col E (5) - Reservado para o ID do convite do Telegram
        
        if (abaMus) {
          abaMus.appendRow(novaLinha);
        }

        const urlMiniAppSecuro = URL_MINI_APP;

        const resBot = apiTelegram('sendMessage', {
          chat_id:           CHAT_ID,
          message_thread_id: Number(idTopico),
          text:              `🎵 *${nome}*\n\n📋 Toque no botão abaixo para registrar nos Charts:`,
          parse_mode:        'Markdown',
          reply_markup: {
            inline_keyboard: [[
              { text: '📋 Registrar nos Charts', url: urlMiniAppSecuro }
            ]]
          }
        });

        // Grava o ID do convite retornado pelo bot na Coluna E da última linha (que acabamos de adicionar)
        if (resBot && resBot.ok && abaMus) {
          try {
            const ultimaLinha = abaMus.getLastRow();
            abaMus.getRange(ultimaLinha, 5).setValue(String(resBot.result.message_id));
          } catch (eRange) {
            log.appendRow([new Date(), 'Erro ao gravar ID do convite na coluna E', eRange.message]);
          }
        }

        log.appendRow([new Date(), 'resposta sendMessage Músicas', JSON.stringify(resBot)]);
      }

      if (cb) processarCallbackQuery(cb);
      if (msg && msg.text && !msg.forum_topic_created) verificarComentarioMetacritic(msg);
      return HtmlService.createHtmlOutput('OK');
    }

    log.appendRow([new Date(), 'nenhuma rota de doPost ativada', 'idChatAtual:', idChatAtual]);

  } catch(err) {
    log.appendRow([new Date(), 'ERRO doPost', err.message, err.stack]);
  }
  return HtmlService.createHtmlOutput('OK');
}

// ── doGet MODIFICADO PARA RESOLVER O PROBLEMA DE CORS VIA FETCH GET ──
function doGet(e) {
  const action = e.parameter.action;
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const log = ss.getSheetByName('LOG_DEBUG') || ss.insertSheet('LOG_DEBUG');

  // ROTA: Obter dados para o Mini App (tópicos de músicas + lista de artistas + vídeos)
  if (action === 'getDados') {
    return ContentService.createTextOutput(JSON.stringify({
      ok:       true,
      musicas:  obterMusicasDaPlanilha(),
      videos:   obterVideosDaPlanilha(),
      artistas: obterListaArtistas()
    })).setMimeType(ContentService.MimeType.JSON);
  }

  // ROTA GRAVAÇÃO DE MÚSICA (CORS-Safe via HTTP GET)
  if (action === 'gravarMusica') {
    try {
      log.appendRow([new Date(), 'doGet action=gravarMusica recebido', e.parameter.data]);
      const body = JSON.parse(e.parameter.data);
      const res = processarGravacaoMusicaLocal(body);
      return ContentService.createTextOutput(JSON.stringify({ ok: true, msg: "Dados gravados", result: res }))
                           .setMimeType(ContentService.MimeType.JSON);
    } catch (err) {
      log.appendRow([new Date(), 'ERRO doGet gravarMusica', err.message]);
      return ContentService.createTextOutput(JSON.stringify({ ok: false, error: err.message }))
                           .setMimeType(ContentService.MimeType.JSON);
    }
  }

  // ROTA GRAVAÇÃO DE VÍDEO (CORS-Safe via HTTP GET)
  if (action === 'gravarVideo') {
    try {
      log.appendRow([new Date(), 'doGet action=gravarVideo recebido', e.parameter.data]);
      const res = processarPayloadWebApp(e.parameter.data);
      return ContentService.createTextOutput(JSON.stringify({ ok: true, msg: "Vídeo gravado", result: res }))
                           .setMimeType(ContentService.MimeType.JSON);
    } catch (err) {
      log.appendRow([new Date(), 'ERRO doGet gravarVideo', err.message]);
      return ContentService.createTextOutput(JSON.stringify({ ok: false, error: err.message }))
                           .setMimeType(ContentService.MimeType.JSON);
    }
  }

  // ROTA VINCULAÇÃO COMENTÁRIO (CORS-Safe via HTTP GET)
  if (action === 'vincularComentario') {
    try {
      log.appendRow([new Date(), 'doGet action=vincularComentario recebido', e.parameter.data]);
      const body = JSON.parse(e.parameter.data);
      vincularComentario(body.musicaVinculada, body.threadId);
      return ContentService.createTextOutput(JSON.stringify({ ok: true, msg: "Comentários vinculados" }))
                           .setMimeType(ContentService.MimeType.JSON);
    } catch (err) {
      log.appendRow([new Date(), 'ERRO doGet vincularComentario', err.message]);
      return ContentService.createTextOutput(JSON.stringify({ ok: false, error: err.message }))
                           .setMimeType(ContentService.MimeType.JSON);
    }
  }

  // ROTA ORIGINAL: Servir o html do Mini App
  return HtmlService.createHtmlOutputFromFile('index')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

// Handler interno compartilhado para gravar músicas e acionar o Telegram
function processarGravacaoMusicaLocal(body) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // 1. Grava de forma persistente e estruturada nas planilhas EXTERNAS
  try {
    const artistasArray = (body.artistas && Array.isArray(body.artistas)) ? body.artistas : [];
    const cacheFake = {
      titulo: body.titulo,
      tipoSingle: body.tipoSingle,
      tipoMusica: body.tipoMusica,
      substituir: body.substituir,
      musicaSubstituida: body.musicaSubstituida,
      artista1: artistasArray[0] || '',
      artista2: artistasArray[1] || '',
      artista3: artistasArray[2] || '',
      artista4: artistasArray[3] || '',
      artista5: artistasArray[4] || '',
      artista6: artistasArray[5] || '',
      threadId: body.threadId
    };
    
    // Grava de forma persistente nas planilhas externas do fluxo (incluindo REGISTRO DE MÚSICA colunas B-N)
    gravarRegistroFinal(cacheFake); // Planilha de Charts (EDIÇÃO CHARTS)
    gravarRegistroNaPlanilhaMusicaExterna(cacheFake); // Planilha de Registro de Músicas (colunas B a N)
  } catch (errExt) {
    // Registra o erro no debug mas prossegue de forma limpa
    const log = ss.getSheetByName('LOG_DEBUG');
    if (log) log.appendRow([new Date(), 'Erro gravarRegistroFinal / gravarRegistroNaPlanilhaMusicaExterna', errExt.message]);
  }

  // 1.2 Lógica específica de Mapeamento de Tópicos e Música Substituída na Planilha Músicas (1zMqnIntj5vAlU4_V_s0xf5suPTtFcl61W9DC9j8LFfM)
  if (body.substituir === 'Sim' && body.musicaSubstituida) {
    try {
      const abaMus = getAbaMusicas();
      if (abaMus) {
        const dataMus = abaMus.getDataRange().getValues();
        let idInserido = '';
        
        // Pesquisa pelo nome do tópico criado (body.titulo) para copiar o ID em B
        for (let i = 1; i < dataMus.length; i++) {
          if (String(dataMus[i][0]).trim().toLowerCase() === String(body.titulo).trim().toLowerCase()) {
            idInserido = String(dataMus[i][1]); // Coluna B
            break;
          }
        }
        
        // Fallback ao threadId do body direto:
        if (!idInserido) {
          idInserido = body.threadId;
        }
        
        // Agora pesquisa pelo nome exato da música selecionada pra ser substituída (body.musicaSubstituida) para colocar esse ID na Coluna D
        if (idInserido && body.musicaSubstituida) {
          for (let i = 1; i < dataMus.length; i++) {
            if (String(dataMus[i][0]).trim().toLowerCase() === String(body.musicaSubstituida).trim().toLowerCase()) {
              abaMus.getRange(i + 1, 4).setValue(idInserido); // Define em D na linha dela com o ID do tópico criado
              break;
            }
          }
        }
      }
    } catch (errMus) {
      const log = ss.getSheetByName('LOG_DEBUG');
      if (log) log.appendRow([new Date(), 'Erro ao mapear substituição na planilha Músicas (1zMqnIntj5vAlU4_V_s0xf5suPTtFcl61W9DC9j8LFfM)', errMus.message]);
    }
  }

  // 1.5 Deleta o botão/mensagem de convite original do bot Telegram se ela existir na Coluna E para este tópico
  try {
    const threadId = body.threadId;
    if (threadId) {
      const abaMus = getAbaMusicas();
      if (abaMus) {
        const dataMus = abaMus.getDataRange().getValues();
        for (let i = 1; i < dataMus.length; i++) {
          if (String(dataMus[i][1]) === String(threadId)) {
            const msgIdConvite = dataMus[i][4]; // Coluna E (índice 4)
            if (msgIdConvite) {
              apiTelegram('deleteMessage', { 
                chat_id: CHAT_ID, 
                message_id: Number(msgIdConvite) 
              });
              // Limpa a Coluna E para marcar como deletado
              abaMus.getRange(i + 1, 5).setValue('');
            }
            break;
          }
        }
      }
    }
  } catch (errDel) {
    const log = ss.getSheetByName('LOG_DEBUG');
    if (log) log.appendRow([new Date(), 'Erro ao deletar convite anterior', errDel.message]);
  }

  // 2. Manda a confirmação no Telegram e envelopa em try-catch silencioso para evitar que falhas no Telegram bloqueiem o sucesso do formulário
  try {
    const artistasArray = (body.artistas && Array.isArray(body.artistas)) ? body.artistas : [];
    const artistas = artistasArray.filter(a => a).join(', ');
    if (body.substituir === 'Sim') {
      enviarMensagemTelegram(body.threadId,
        `🔄 *Substituído com sucesso!*` +
        `\n\n🎵 *${body.titulo}*` +
        `\n💿 ${body.tipoSingle}` +
        `\n👥 ${body.tipoMusica}: ${artistas}` +
        `\n🔄 Substituiu nos Charts: ${body.musicaSubstituida}`
      );
    } else {
      enviarMensagemTelegram(body.threadId,
        `✅ *Registrado com sucesso!*` +
        `\n\n🎵 *${body.titulo}*` +
        `\n💿 ${body.tipoSingle}` +
        `\n👥 ${body.tipoMusica}: ${artistas}`
      );
    }
  } catch (errTg) {
    Logger.log('Erro ao notificar no Telegram: ' + errTg.message);
  }

  return { ok: true };
}

function obterMusicasDaPlanilha() {
  const sheet = getAbaMusicas();
  if (!sheet || sheet.getLastRow() < 2) return [];
  const data  = sheet.getRange(2, 1, sheet.getLastRow() - 1, 2).getValues();
  const lista = [];
  data.forEach(row => {
    if (row[0] && row[1]) lista.push({ titulo: String(row[0]), threadId: String(row[1]) });
  });
  return lista;
}

function obterVideosDaPlanilha() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Vídeos') || ss.getSheetByName('Videos');
  if (!sheet || sheet.getLastRow() < 2) return [];
  const data  = sheet.getRange(2, 1, sheet.getLastRow() - 1, 2).getValues();
  const lista = [];
  data.forEach(row => {
    if (row[0] && row[1]) lista.push({ titulo: String(row[0]), threadId: String(row[1]) });
  });
  return lista;
}

// Configuração inicial do Webhook do Bot
function setupProject() {
  const urlExec = ScriptApp.getService().getUrl();
  const res = UrlFetchApp.fetch(
    `https://api.telegram.org/bot${BOT_TOKEN}/setWebhook`,
    { method: 'post', contentType: 'application/json',
      payload: JSON.stringify({ url: urlExec }), muteHttpExceptions: true }
  );
  Logger.log(res.getContentText());
}


// ==========================================
// 2_api_telegram.gs — COMUNICAÇÃO COM O TELEGRAM
// ==========================================

function apiTelegram(metodo, payload) {
  const url = `https://api.telegram.org/bot${BOT_TOKEN}/${metodo}`;
  const options = {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };
  return JSON.parse(UrlFetchApp.fetch(url, options).getContentText());
}

// Músicas
function enviarMensagemTelegram(threadId, texto, teclado = null) {
  let payload = { chat_id: CHAT_ID, message_thread_id: Number(threadId), text: texto, parse_mode: 'Markdown' };
  if (teclado) payload.reply_markup = teclado;
  return apiTelegram('sendMessage', payload);
}
function deletarMensagemTelegram(messageId) {
  if (!messageId) return;
  apiTelegram('deleteMessage', { chat_id: CHAT_ID, message_id: messageId });
}

// Vídeos
function enviarMensagemTelegramVideos(threadId, texto, teclado = null) {
  let payload = { chat_id: CHAT_ID_VIDEOS, message_thread_id: Number(threadId), text: texto, parse_mode: 'Markdown' };
  if (teclado) payload.reply_markup = teclado;
  return apiTelegram('sendMessage', payload);
}
function deletarMensagemTelegramVideos(messageId) {
  if (!messageId) return;
  apiTelegram('deleteMessage', { chat_id: CHAT_ID_VIDEOS, message_id: messageId });
}

// Álbuns
function enviarMensagemTelegramAlbuns(threadId, texto, teclado = null) {
  let payload = { chat_id: CHAT_ID_ALBUNS, message_thread_id: Number(threadId), text: texto, parse_mode: 'Markdown' };
  if (teclado) payload.reply_markup = teclado;
  return apiTelegram('sendMessage', payload);
}
function deletarMensagemTelegramAlbuns(messageId) {
  if (!messageId) return;
  apiTelegram('deleteMessage', { chat_id: CHAT_ID_ALBUNS, message_id: messageId });
}


// ==========================================
// 3_cache.gs — CACHE TEMPORÁRIO + FUNÇÕES COMPARTILHADAS
// ==========================================

function obterCache(userId, threadId) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Bot_Cache') || ss.insertSheet('Bot_Cache');
  const lr = sheet.getLastRow();
  if (lr < 2) return null;
  const chave = `${userId}_${threadId}`;
  const dados = sheet.getRange(2, 1, lr - 1, 2).getValues();
  for (let i = 0; i < dados.length; i++) {
    if (dados[i][0] === chave) return JSON.parse(dados[i][1]);
  }
  return null;
}

function salvarCache(userId, threadId, objetoCache) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Bot_Cache') || ss.insertSheet('Bot_Cache');
  const lr = sheet.getLastRow();
  const chave = `${userId}_${threadId}`;
  if (lr >= 2) {
    const dados = sheet.getRange(2, 1, lr - 1, 1).getValues();
    for (let i = 0; i < dados.length; i++) {
      if (dados[i][0] === chave) { sheet.getRange(i + 2, 2).setValue(JSON.stringify(objetoCache)); return; }
    }
  }
  sheet.appendRow([chave, JSON.stringify(objetoCache), new Date()]);
}

function limparCache(userId, threadId) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Bot_Cache');
  if (!sheet) return;
  const lr = sheet.getLastRow();
  if (lr < 2) return;
  const chave = `${userId}_${threadId}`;
  const dados = sheet.getRange(2, 1, lr - 1, 1).getValues();
  for (let i = 0; i < dados.length; i++) {
    if (dados[i][0] === chave) { sheet.deleteRow(i + 2); break; }
  }
}

function obterNomeOff(userId) {
  try {
    const sheet = SpreadsheetApp.openById(EXT_JOGADORES_ID).getSheetByName('Jogadores');
    const data = sheet.getRange(2, 2, sheet.getLastRow() - 1, 2).getValues();
    for (let i = 0; i < data.length; i++) {
      if (String(data[i][0]) === String(userId)) return data[i][1];
    }
  } catch(e) { Logger.log('Erro ao buscar OFF: ' + e.message); }
  return 'Desconhecido (' + userId + ')';
}

function registrarComentarioExterno(nomeOff, nomeTopico) {
  try {
    const sheet = SpreadsheetApp.openById(EXT_REGISTRO_COMENTARIOS_ID).getSheetByName('REGISTRO');
    const colunaB = sheet.getRange(1, 2, sheet.getMaxRows(), 1).getValues();
    let primeiraVazia = 0;
    for (let i = 2; i < colunaB.length; i++) {
      if (colunaB[i][0] === '') { primeiraVazia = i + 1; break; }
    }
    if (primeiraVazia === 0) primeiraVazia = sheet.getMaxRows() + 1;
    sheet.getRange(primeiraVazia, 2).setValue(nomeOff);
    sheet.getRange(primeiraVazia, 3).setValue(nomeTopico);
    sheet.getRange(primeiraVazia, 4).setValue('COMENTÁRIOS (SINGLES, VÍDEOS, MÚSICAS)');
  } catch(e) { Logger.log('Erro registrarComentarioExterno: ' + e.message); }
}

function obterMusicasPlanilhaExterna() {
  try {
    const sheet = SpreadsheetApp.openById(EXT_SPREADSHEET_ID).getSheetByName('EDIÇÃO CHARTS');
    return sheet.getRange(2, 2, sheet.getLastRow() - 1, 1).getValues()
      .map(r => String(r[0]).trim()).filter(String);
  } catch(e) { return []; }
}

function obterListaRapida(nomeAba, numColuna) {
  try {
    const sheet = SpreadsheetApp.openById(EXT_SPREADSHEET_ID).getSheetByName(nomeAba);
    return sheet.getRange(2, numColuna, sheet.getLastRow() - 1, 1).getValues()
      .map(r => String(r[0]).trim()).filter(String);
  } catch(e) { return []; }
}

function vincularComentario(nomeMusica, threadId) {
  try {
    const abaMusicas = getAbaMusicas();
    if (abaMusicas) {
      const dataMusicas = abaMusicas.getDataRange().getValues();
      let threadIdPai = '';
      
      // Busca pelo threadId da música pai (que tem o nome igual a nomeMusica na Coluna A)
      for (let i = 1; i < dataMusicas.length; i++) {
        if (String(dataMusicas[i][0]).trim().toLowerCase() === String(nomeMusica).trim().toLowerCase()) {
          threadIdPai = String(dataMusicas[i][1]); // ThreadID na Coluna B
          break;
        }
      }
      
      // Se achou o ID do tópico pai, atualiza a Coluna D (índice 3, coluna 4) da linha do tópico atual (threadId)
      if (threadIdPai) {
        for (let i = 1; i < dataMusicas.length; i++) {
          if (String(dataMusicas[i][1]) === String(threadId)) {
            abaMusicas.getRange(i + 1, 4).setValue(threadIdPai); // Coluna D substitui pelo ID do tópico pai
            break;
          }
        }
      }
    }

    const sheet = SpreadsheetApp.openById(EXT_SPREADSHEET_ID).getSheetByName('EDIÇÃO CHARTS');
    const data = sheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][1]).trim().toLowerCase() === String(nomeMusica).trim().toLowerCase()) {
        const abaMusicasReal = getAbaMusicas();
        const threadIdChatAtual = abaMusicasReal ? abaMusicasReal.getDataRange().getValues()
          .find(r => String(r[1]) === String(threadId)) : null;
        if (threadIdChatAtual) sheet.getRange(i + 1, 5).setValue(threadIdChatAtual[0]);
        break;
      }
    }
  } catch(e) { Logger.log('Erro vincularComentario: ' + e.message); }
}

function gravarRegistroFinal(cache) {
  const sheet = SpreadsheetApp.openById(EXT_SPREADSHEET_ID).getSheetByName('EDIÇÃO CHARTS');
  if (!sheet) throw new Error("Aba 'EDIÇÃO CHARTS' não encontrada na planilha externa");
  const data = sheet.getDataRange().getValues();
  const hoje = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'dd/MM/yyyy');

  // Valores dos artistas inseridos (de 1 a 6)
  const artista1 = cache.artista1 || '';
  const artista2 = cache.artista2 || '';
  const artista3 = cache.artista3 || '';
  const artista4 = cache.artista4 || '';
  const artista5 = cache.artista5 || '';
  const artista6 = cache.artista6 || '';

  // Caso seja uma substituição de música (conforme especificação detalhada do usuário)
  if (cache.substituir === 'Sim' && cache.musicaSubstituida) {
    for (let i = 1; i < data.length; i++) {
      // Pesquisar em A (índice 0) pelo nome de música escolhido pra substituir (cache.musicaSubstituida)
      if (String(data[i][0]).trim().toLowerCase() === String(cache.musicaSubstituida).trim().toLowerCase()) {
        const linhaAlvo = i + 1;
        sheet.getRange(linhaAlvo, 1).setValue(cache.titulo || ''); // Mudar o nome pro nome novo (Coluna A)
        sheet.getRange(linhaAlvo, 3).setValue(cache.tipoSingle || ''); // Mudar o tipo de single em C pra o tipo selecionado
        sheet.getRange(linhaAlvo, 4).setValue(cache.tipoMusica || ''); // Mudar o tipo de música em D pra o tipo selecionado
        sheet.getRange(linhaAlvo, 6).setValue(1); // Mudar em F pra o número 1
        sheet.getRange(linhaAlvo, 8).setValue(artista1); // Preencher em H o nome do act principal
        sheet.getRange(linhaAlvo, 9).setValue(artista2); // Preencher em I...
        sheet.getRange(linhaAlvo, 10).setValue(artista3); // ...até M se tiver algum artista a mais (Coluna J)
        sheet.getRange(linhaAlvo, 11).setValue(artista4); // Coluna K
        sheet.getRange(linhaAlvo, 12).setValue(artista5); // Coluna L
        sheet.getRange(linhaAlvo, 13).setValue(artista6); // Coluna M
        return;
      }
    }
  }

  // Caso normal (nova música): procura a primeira linha onde a Coluna A estiver vazia (sem nada nas células)
  let primeiraVazia = 0;
  for (let i = 1; i < data.length; i++) {
    if (!data[i][0]) { // Coluna A vazia
      primeiraVazia = i + 1;
      break;
    }
  }
  if (primeiraVazia === 0) primeiraVazia = data.length + 1;

  sheet.getRange(primeiraVazia, 1).setValue(hoje); // Coluna A: data da atualização
  sheet.getRange(primeiraVazia, 2).setValue(cache.titulo || ''); // Coluna B: nome da música (nome do tópico)
  sheet.getRange(primeiraVazia, 3).setValue(cache.tipoSingle || ''); // Coluna C: tipo de single
  sheet.getRange(primeiraVazia, 4).setValue(cache.tipoMusica || ''); // Coluna D: tipo de música
  sheet.getRange(primeiraVazia, 5).setValue(''); // Coluna E: sem dado por enquanto
  sheet.getRange(primeiraVazia, 6).setValue(1); // Coluna F: sempre o número 1
  sheet.getRange(primeiraVazia, 7).setValue(''); // Coluna G: sem dado
  sheet.getRange(primeiraVazia, 8).setValue(artista1); // Coluna H: sempre o artista principal
  sheet.getRange(primeiraVazia, 9).setValue(artista2); // Coluna I
  sheet.getRange(primeiraVazia, 10).setValue(artista3); // Coluna J
  sheet.getRange(primeiraVazia, 11).setValue(artista4); // Coluna K
  sheet.getRange(primeiraVazia, 12).setValue(artista5); // Coluna L
  sheet.getRange(primeiraVazia, 13).setValue(artista6); // Coluna M
}

function gravarRegistroNaPlanilhaMusicaExterna(cache) {
  try {
    const targetSs = SpreadsheetApp.openById('1wNbtP78MrtrOc2Jb1ejXcHVjqndR2Vm4-3EIVqa8aOg');
    let targetSheet = targetSs.getSheetByName('REGISTRO DE MÚSICA') || targetSs.getSheetByName('REGISTRO') || targetSs.getSheets()[0];
    
    const rawData = targetSheet.getDataRange().getValues();
    const hoje = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'dd/MM/yyyy');
    
    let lRow = 0;
    // Procuramos se já existe alguma linha correspondente para este Tópico (ThreadID na Coluna N)
    // Se for uma substituição de música ou se re-registrar, atualizamos a linha existente
    if (cache.threadId) {
      for (let i = 1; i < rawData.length; i++) {
        if (String(rawData[i][13]) === String(cache.threadId)) { // Coluna N [13]
          lRow = i + 1;
          break;
        }
      }
    }
    
    // Se não encontrou linha de tópico anterior, procura pela primeira vazia na coluna B.
    if (lRow === 0) {
      for (let i = 1; i < rawData.length; i++) {
        if (!rawData[i][1]) { // Coluna B [1] vazia
          lRow = i + 1;
          break;
        }
      }
    }
    
    // Se mesmo assim não achou linha em branco, anexa no fim
    if (lRow === 0) lRow = rawData.length + 1;
    
    // Escreve nas colunas B a N (Colunas 2 a 14)
    targetSheet.getRange(lRow, 2).setValue(cache.titulo || ''); // B: Título da música
    targetSheet.getRange(lRow, 3).setValue(cache.tipoSingle || ''); // C: Tipo do Single
    targetSheet.getRange(lRow, 4).setValue(cache.tipoMusica || ''); // D: Formato do Artista (SOLO/PARCERIA/etc)
    targetSheet.getRange(lRow, 5).setValue(cache.artista1 || ''); // E: Artista Principal (Artista 1)
    targetSheet.getRange(lRow, 6).setValue(cache.artista2 || ''); // F: Colaborador 1 (Artista 2)
    targetSheet.getRange(lRow, 7).setValue(cache.artista3 || ''); // G: Colaborador 2 (Artista 3)
    targetSheet.getRange(lRow, 8).setValue(cache.artista4 || ''); // H: Colaborador 3 (Artista 4)
    targetSheet.getRange(lRow, 9).setValue(cache.artista5 || ''); // I: Colaborador 4 (Artista 5)
    targetSheet.getRange(lRow, 10).setValue(cache.artista6 || ''); // J: Colaborador 5 (Artista 6)
    targetSheet.getRange(lRow, 11).setValue(cache.substituir === 'Sim' ? 'Sim' : 'Não'); // K: Substituir
    targetSheet.getRange(lRow, 12).setValue(cache.musicaSubstituida || ''); // L: Música Substituída
    targetSheet.getRange(lRow, 13).setValue(hoje); // M: Data do Registro
    targetSheet.getRange(lRow, 14).setValue(cache.threadId || ''); // N: Topic (Thread) ID do Telegram
  } catch (e) {
    Logger.log('Erro gravarRegistroNaPlanilhaMusicaExterna: ' + e.message);
  }
}

function obterListaArtistas() {
  try {
    const sheet = SpreadsheetApp.openById('1GPajSCp1TkJDEDOGZIrXxgZuNuRs7545buFntyDlpL8')
                                 .getSheetByName('Banco de Dados Artistas');
    if (!sheet || sheet.getLastRow() < 2) return [];
    const data = sheet.getRange(2, 1, sheet.getLastRow() - 1, 1).getDisplayValues();
    return data.map(r => String(r[0])).filter(n => n.trim() !== '');
  } catch(e) {
    Logger.log('Erro obterListaArtistas: ' + e.message);
    return [];
  }
}

function jaVotouMetacritic(userId, threadId) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Controle_Metacritic') || ss.insertSheet('Controle_Metacritic');
  if (sheet.getLastRow() === 0) sheet.appendRow(['UserID', 'ThreadID', 'Nota']);
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(userId) && String(data[i][1]) === String(threadId)) return true;
  }
  return false;
}

function registrarVotoMetacriticControle(userId, threadId, nota) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Controle_Metacritic');
  if (sheet) sheet.appendRow([userId, threadId, nota]);
}

function jaVotouLike(userId, threadId) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Controle_Likes') || ss.insertSheet('Controle_Likes');
  if (sheet.getLastRow() === 0) sheet.appendRow(['UserID', 'ThreadID']);
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(userId) && String(data[i][1]) === String(threadId)) return true;
  }
  return false;
}

function registrarVotoLikeControle(userId, threadId) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Controle_Likes') || ss.insertSheet('Controle_Likes');
  sheet.appendRow([userId, threadId]);
}

function jaVotouMetacriticAlbum(userId, threadId) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Controle_Metacritic_Albuns') || ss.insertSheet('Controle_Metacritic_Albuns');
  if (sheet.getLastRow() === 0) sheet.appendRow(['UserID', 'ThreadID', 'Nota']);
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(userId) && String(data[i][1]) === String(threadId)) return true;
  }
  return false;
}

function registrarVotoMetacriticAlbumControle(userId, threadId, nota) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Controle_Metacritic_Albuns') || ss.insertSheet('Controle_Metacritic_Albuns');
  sheet.appendRow([userId, threadId, nota]);
}


// ==========================================
// 4_handlers_musicas.gs — COMENTÁRIOS + METACRITIC
// ==========================================

function verificarComentarioMetacritic(msg) {
  const threadId = msg.message_thread_id;
  const userId   = msg.from.id;
  if (!threadId) return;
  const sheet = getAbaMusicas();
  if (!sheet) return;
  const data = sheet.getDataRange().getValues();
  let eCriador = false, topicoExiste = false;
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][1]) === String(threadId)) {
      topicoExiste = true;
      // Compatibilidade reversa: Col P (índice 15) como principal, Col C (índice 2) como fallback
      const idCriadorSalvo = data[i][15] ? String(data[i][15]) : String(data[i][2]);
      if (idCriadorSalvo === String(userId)) eCriador = true;
      break;
    }
  }
  if (!topicoExiste || eCriador) return;
  if (jaVotouMetacritic(userId, threadId)) return;
  const botoes = [
    [{ text: '45 a 60', callback_data: 'meta_45_60' }, { text: '61 a 75', callback_data: 'meta_61_75' }],
    [{ text: '76 a 90', callback_data: 'meta_76_90' }, { text: '91 a 100', callback_data: 'meta_91_100' }]
  ];
  enviarMensagemTelegram(threadId, '📊 *Analisando para o Metacritic, qual nota você dá?*', { inline_keyboard: botoes });
}

function processarCallbackQuery(cb) {
  const data      = cb.data;
  const threadId  = cb.message.message_thread_id;
  const userId    = cb.from.id;
  const messageId = cb.message.message_id;
  const log       = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('LOG_DEBUG');

  try {
    apiTelegram('answerCallbackQuery', { callback_query_id: cb.id });

    if (data.startsWith('meta_')) {
      apiTelegram('deleteMessage', { chat_id: CHAT_ID, message_id: messageId });
      const partes       = data.split('_');
      const min          = parseInt(partes[1]);
      const max          = parseInt(partes[2]);
      const notaSorteada = Math.floor(Math.random() * (max - min + 1)) + min;
      registrarVotoMetacriticControle(userId, threadId, notaSorteada);
      const nomeOff    = obterNomeOff(userId);
      const nomeTopico = registrarNotaEMediaMusicas(threadId, notaSorteada, nomeOff);
      if (nomeTopico) registrarComentarioExterno(nomeOff, nomeTopico);
    }
  } catch(err) {
    if (log) log.appendRow([new Date(), 'ERRO callback música', err.message]);
  }
}

function registrarNotaEMediaMusicas(threadId, nota, nomeOff) {
  try {
    const sheet = getAbaMusicas();
    if (!sheet) return null;
    const data  = sheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][1]) === String(threadId)) {
        // Retorna apenas o nome original (Coluna A) para prosseguir com o fluxo de comentários na planilha externa,
        // sem realizar nenhum preenchimento em colunas extras como F e G (6 e 7), garantindo que nada além de A até D 
        // esteja preenchido na aba Músicas local.
        return data[i][0];
      }
    }
  } catch (err) {
    Logger.log('Erro em registrarNotaEMediaMusicas: ' + err.message);
  }
  return null;
}


// ==========================================
// 5_handlers_videos.gs — FLUXO DE VÍDEOS + LIKES
// ==========================================

function iniciarFluxoVideos(threadId, nomeTopico) {
  const txt = `🎬 Olá! Deseja registrar comentários para o material "${nomeTopico}"?`;
  const teclado = { inline_keyboard: [[{ text: "✅ Sim", callback_data: "v_start_sim" }, { text: "❌ Não", callback_data: "v_start_nao" }]] };
  enviarMensagemTelegramVideos(threadId, txt, teclado);
}

// Auxiliar para editar vídeos
function apiTelegramVideos(metodo, payload) {
  const url = `https://api.telegram.org/bot${TOKEN_BOT_VIDEOS}/${metodo}`;
  const options = { method: 'post', contentType: 'application/json', payload: JSON.stringify(payload), muteHttpExceptions: true };
  const resposta = UrlFetchApp.fetch(url, options); return JSON.parse(resposta.getContentText());
}

function processarCallbackQueryVideos(cb) {
  const data = cb.data;
  const threadId = cb.message.message_thread_id;
  const messageId = cb.message.message_id;
  const userId = cb.from.id;

  apiTelegramVideos("answerCallbackQuery", { callback_query_id: cb.id });

  if (data.startsWith("v_like_")) {
    processarCallbackLikes(data, threadId, userId, messageId);
    return;
  }

  if (data === "v_start_nao") { deletarMensagemTelegramVideos(messageId); return; }

  if (data === "v_start_sim") {
    deletarMensagemTelegramVideos(messageId); 
    const urlNativa = `${URL_MINI_APP}?startapp=${threadId}&threadId=${threadId}`;
    const tecladoApp = { inline_keyboard: [[ { text: "Abrir Panel", url: urlNativa } ]] };
    let res = enviarMensagemTelegramVideos(threadId, "⚙️ Toque abaixo para configurar:", tecladoApp);
    if (res && res.ok) salvarCache("appMsg", threadId, { msgId: res.result.message_id });
  }
}

function processarPayloadWebApp(payloadString) {
  try {
    const dados = JSON.parse(payloadString);
    const threadId = String(dados.threadId);
    
    if (!threadId || threadId === "undefined") return "ERRO: ID do tópico inválido.";

    let selecionados = dados.selecionados || [];
    if (dados.tipo === 'album') selecionados = selecionados.map(v => `(ALBUM) - ${v}`);

    // 1. Grava na aba Vídeos (Local e Externa)
    salvarMaterialNasAbas(threadId, selecionados, dados.tipo);

    // 2. Marca o YouTube na Planilha de PONTOS
    if (dados.youtube && selecionados.length > 0) {
      marcarLancamentoYouTube(selecionados[0]);
    }

    // 3. Limpa o cache e apaga o botão
    let cacheMsg = obterCache("appMsg", threadId);
    if (cacheMsg && cacheMsg.msgId) {
      deletarMensagemTelegramVideos(cacheMsg.msgId);
      limparCache("appMsg", threadId);
    }
    
    return "SUCESSO";
  } catch (e) { return "ERRO: " + e.message; }
}

function salvarMaterialNasAbas(threadId, materiais, tipoMaterial) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheetLocal = ss.getSheetByName("Vídeos") || ss.getSheetByName("Videos");
  let nomeTopico = "Material Sem Nome";
  
  if (sheetLocal) {
    const dados = sheetLocal.getDataRange().getValues();
    for (let i = 1; i < dados.length; i++) {
      if (String(dados[i][1]) === String(threadId)) {
        sheetLocal.getRange(i + 1, 4).setValue(materiais[0] || "");
        sheetLocal.getRange(i + 1, 5).setValue(materiais[1] || "");
        sheetLocal.getRange(i + 1, 6).setValue(materiais[2] || "");
        sheetLocal.getRange(i + 1, 8).setValue(tipoMaterial.toUpperCase());
        nomeTopico = dados[i][0];
        break;
      }
    }
  }

  try {
    const sheetExt = SpreadsheetApp.openById(ID_PLAN_JOGADORES).getSheetByName("Vídeos") || SpreadsheetApp.openById(ID_PLAN_JOGADORES).getSheetByName("Videos");
    const dadosExt = sheetExt.getDataRange().getValues();
    let encontrou = false;
    for (let i = 1; i < dadosExt.length; i++) {
      if (String(dadosExt[i][1]) === String(threadId)) {
        sheetExt.getRange(i + 1, 4).setValue(materiais[0] || "");
        sheetExt.getRange(i + 1, 5).setValue(materiais[1] || "");
        sheetExt.getRange(i + 1, 6).setValue(materiais[2] || "");
        sheetExt.getRange(i + 1, 8).setValue(tipoMaterial.toUpperCase());
        encontrou = true; break;
      }
    }
    if (!encontrou) {
      sheetExt.appendRow([nomeTopico, threadId, "", materiais[0] || "", materiais[1] || "", materiais[2] || "", "", tipoMaterial.toUpperCase()]);
    }
  } catch(e) {}
}

function marcarLancamentoYouTube(nomeMusica) {
  try {
    const sheet = SpreadsheetApp.openById(ID_PLAN_REGISTRO).getSheetByName("PONTOS");
    const dados = sheet.getRange(1, 4, sheet.getLastRow(), 1).getValues(); 
    const hoje = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "dd/MM/yyyy");
    const alvo = String(nomeMusica).replace(/&quot;/g, '"').trim().toLowerCase();

    for (let i = 0; i < dados.length; i++) {
      if (dados[i][0] && String(dados[i][0]).trim().toLowerCase() === alvo) {
        sheet.getRange(i + 1, 14).setValue(true); // Coluna N
        sheet.getRange(i + 1, 15).setValue(hoje); // Coluna O
        break;
      }
    }
  } catch(e) {}
}

function verificarComentarioTerceiros(msg) {
  const threadId = msg.message_thread_id;
  const userId = msg.from.id;
  if (!threadId) return;
  const sheet = (SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Vídeos') ||
                 SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Videos'));
  if (!sheet) return;
  const data = sheet.getDataRange().getValues();
  let eCriador = false, registrado = false;
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][1]) === String(threadId)) {
      registrado = true;
      if (String(data[i][2]) === String(userId)) eCriador = true;
      break;
    }
  }
  if (!registrado || eCriador) return;
  if (jaVotouLike(userId, threadId)) return;
  const txt = '👍 *Quantos likes este vídeo tem?*';
  const botoes = [
    [{ text: '40 a 65 mil', callback_data: 'v_like_40_65_' + threadId },
     { text: '66 a 80 mil', callback_data: 'v_like_66_80_' + threadId }],
    [{ text: '81 a 90 mil', callback_data: 'v_like_81_90_' + threadId },
     { text: '91 a 100 mil', callback_data: 'v_like_91_100_' + threadId }]
  ];
  enviarMensagemTelegramVideos(threadId, txt, { inline_keyboard: botoes });
}

function processarCallbackLikes(data, threadId, userId, messageId) {
  try {
    deletarMensagemTelegramVideos(messageId);
    const partes = data.split('_');
    const min = parseInt(partes[2]) * 1000;
    const max = parseInt(partes[3]) * 1000;
    const likesSorteados = Math.floor(Math.random() * (max - min + 1)) + min;
    registrarVotoLikeControle(userId, threadId);
    const nomeOff = obterNomeOff(userId);
    const xx = registrarLikeEMedia(threadId, likesSorteados, nomeOff);
    if (xx) registrarComentarioExterno(nomeOff, xx);
  } catch (e) { Logger.log('Erro likes: ' + e.message); }
}

function registrarLikeEMedia(threadId, likes, nomeOff) {
  const sheet = (SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Vídeos') ||
                 SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Videos'));
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][1]) === String(threadId)) {
      let atual = data[i][6] || '';
      let nova = atual ? mt_join(atual, nomeOff, likes) : nomeOff + ': ' + likes;
      let soma = 0, qtd = 0;
      nova.split(', ').forEach(e => {
        let p = e.split(': ');
        if (p.length === 2 && !isNaN(parseInt(p[1]))) { soma += parseInt(p[1]); qtd++; }
      });
      sheet.getRange(i + 1, 7).setValue(qtd > 0 ? Math.round(soma / qtd) : 0);
      return data[i][0];
    }
  }
  return null;
}

function mt_join(atual, nome, valor) {
  return atual + ', ' + nome + ': ' + valor;
}


// ==========================================
// 6_handlers_albuns.gs — FLUXO COMPLETO DE ÁLBUNS
// ==========================================

function iniciarFluxoAlbuns(threadId, nomeTopico) {
  enviarMensagemTelegramAlbuns(threadId,
    `📀 *Novo tópico detectado:* "${nomeTopico}"\n\nO que deseja fazer?`,
    { inline_keyboard: [
      [{ text: '🆕 Registro', callback_data: 'alb_reg_sim' },
       { text: '🔄 Substituição', callback_data: 'alb_sub_ini' }]
    ]}
  );
}

function processarCallbackQueryAlbuns(cb) {
  const data  = cb.data;
  const threadId  = cb.message.message_thread_id;
  const messageId = cb.message.message_id;
  const userId    = cb.from.id;
  apiTelegram('answerCallbackQuery', { callback_query_id: cb.id });

  if (data.startsWith('alb_meta_')) { processarVotoMetacriticAlbum(data, threadId, userId, messageId); return; }
  if (!data.startsWith('alb_pag_')) deletarMensagemTelegramAlbuns(messageId);

  let cache = obterCache(userId, threadId) || { titulo: 'Álbum Desconhecido' };

  if (data === 'alb_reg_sim') {
    cache.modoAlbum = 'registro';
    salvarCache(userId, threadId, cache);
    perguntarTipoLancamento(threadId);

  } else if (data === 'alb_sub_ini') {
    cache.modoAlbum = 'substituicao';
    salvarCache(userId, threadId, cache);
    exibirListaAlbunsParaSubstituir(threadId);

  } else if (data.startsWith('alb_sub_escolha_')) {
    const idx = parseInt(data.replace('alb_sub_escolha_', ''));
    cache.albumSubstituido = obterListaRapida('EDIÇÃO CHARTS ÁLBUMS', 4)[idx];
    salvarCache(userId, threadId, cache);
    perguntarArtistaPrincipalAlbum(threadId);

  } else if (data.startsWith('alb_tipo_')) {
    cache.tipoLancamento = data.replace('alb_tipo_', '');
    salvarCache(userId, threadId, cache);
    perguntarArtistaPrincipalAlbum(threadId);

  } else if (data.startsWith('alb_art_')) {
    cache.artistaPrincipal = data.replace('alb_art_', '');
    salvarCache(userId, threadId, cache);
    const r = enviarMensagemTelegramAlbuns(threadId, '🔢 *Quantas músicas tem o projeto?* (somente o número)');
    if (r && r.ok) cache.idMsgQtd = r.result.message_id;
    cache.aguardandoQtdMusicas = true;
    salvarCache(userId, threadId, cache);

  } else if (data.startsWith('alb_mus_tipo_')) {
    const partes = data.split('_');
    const tipoMusica = partes[3];
    const indice = parseInt(partes[4]);
    cache.musicas = cache.musicas || [];
    if (!cache.musicas[indice]) cache.musicas[indice] = {};
    cache.musicas[indice].tipo = tipoMusica;
    salvarCache(userId, threadId, cache);
    perguntarTipoMusica_Album(threadId, indice, cache);

  } else if (data.startsWith('alb_mus_formato_')) {
    const partes = data.split('_');
    const formato = partes[3];
    const indice = parseInt(partes[4]);
    cache.musicas[indice].formato = formato;
    salvarCache(userId, threadId, cache);
    avancarParaProximaMusicaAlbum(threadId, userId, indice, cache);

  } else if (data === 'alb_confirmar') {
    try {
      gravarRegistroFinalAlbum(cache, threadId);
      limparCache(userId, threadId);
    } catch(e) {
      enviarMensagemTelegramAlbuns(threadId, `❌ *Erro ao gravar:* ${e.message}`);
    }

  } else if (data === 'alb_cancelar') {
    limparCache(userId, threadId);
    enviarMensagemTelegramAlbuns(threadId, '❌ Registro cancelado.');
  }
}

function perguntarTipoLancamento(threadId) {
  enviarMensagemTelegramAlbuns(threadId, '💿 *Qual é o tipo de lançamento?*', { inline_keyboard: [
    [{ text: 'EP',     callback_data: 'alb_tipo_EP'     }, { text: 'Álbum', callback_data: 'alb_tipo_ALBUM' }],
    [{ text: 'Deluxe', callback_data: 'alb_tipo_DELUXE' }, { text: 'Outros', callback_data: 'alb_tipo_OUTROS' }]
  ]});
}

function perguntarArtistaPrincipalAlbum(threadId) {
  const lista = obterListaArtistas();
  const itensPorPag = 10;
  const artsPag = lista.slice(0, itensPorPag);
  let botoes = [];
  for (let i = 0; i < artsPag.length; i += 2) {
    let linha = [{ text: artsPag[i], callback_data: 'alb_art_' + artsPag[i].substring(0, 20) }];
    if (artsPag[i+1]) linha.push({ text: artsPag[i+1], callback_data: 'alb_art_' + artsPag[i+1].substring(0, 20) });
    botoes.push(linha);
  }
  if (lista.length > itensPorPag) botoes.push([{ text: 'Próxima ➡️', callback_data: 'alb_pag_art_1' }]);
  botoes.push([{ text: '✏️ Digitar manualmente', callback_data: 'alb_art_OUTRO' }]);
  enviarMensagemTelegramAlbuns(threadId, '👤 *Quem é o artista principal?*', { inline_keyboard: botoes });
}

function exibirListaAlbunsParaSubstituir(threadId) {
  const lista = obterListaRapida('EDIÇÃO CHARTS ÁLBUMS', 4);
  let botoes = lista.slice(0, 15).map((a, i) => [{ text: a, callback_data: 'alb_sub_escolha_' + i }]);
  enviarMensagemTelegramAlbuns(threadId, '🔄 *Qual álbum deseja substituir?*', { inline_keyboard: botoes });
}

function perguntarTipoEntradaMusica(threadId, indice) {
  enviarMensagemTelegramAlbuns(threadId,
    `🎵 *Música ${indice + 1}:* Qual o tipo?`,
    { inline_keyboard: [
      [{ text: 'INTERLUDE',      callback_data: `alb_mus_tipo_INTERLUDE_${indice}` },
       { text: 'TRACKLIST ALBUM', callback_data: `alb_mus_tipo_TRACKLIST ALBUM_${indice}` }],
      [{ text: 'JÁ EXISTE NOS CHARTS', callback_data: `alb_mus_tipo_JÁ EXISTE_${indice}` }]
    ]}
  );
}

function perguntarTipoMusica_Album(threadId, indice, cache) {
  enviarMensagemTelegramAlbuns(threadId,
    `🎤 *Música ${indice + 1} — "${cache.musicas[indice].nome}":*\nQual o formato?`,
    { inline_keyboard: [
      [{ text: 'SOLO',     callback_data: `alb_mus_formato_SOLO_${indice}` },
       { text: 'PARCERIA', callback_data: `alb_mus_formato_PARCERIA_${indice}` }],
      [{ text: 'DUETO',    callback_data: `alb_mus_formato_DUETO_${indice}` },
       { text: 'CONJUNTO', callback_data: `alb_mus_formato_CONJUNTO_${indice}` }]
    ]}
  );
}

function avancarParaProximaMusicaAlbum(threadId, userId, indiceAtual, cache) {
  const total = cache.qtdMusicas || 0;
  const proximo = indiceAtual + 1;
  if (proximo < total) {
    cache.aguardandoNomeMusica = proximo;
    salvarCache(userId, threadId, cache);
    const r = enviarMensagemTelegramAlbuns(threadId,
      `✏️ *Digite o nome da Música ${proximo + 1}:*`);
    if (r && r.ok) cache.idMsgNomeMusica = r.result.message_id;
    salvarCache(userId, threadId, cache);
  } else {
    exibirResumoAlbum(threadId, cache);
  }
}

function exibirResumoAlbum(threadId, cache) {
  let resumo = `📝 *Resumo do Álbum:*\n\n• Título: ${cache.titulo}\n• Tipo: ${cache.tipoLancamento || '-'}\n• Artista: ${cache.artistaPrincipal || '-'}\n• Músicas: ${cache.qtdMusicas || 0}\n`;
  if (cache.albumSubstituido) resumo += `• Substituindo: ${cache.albumSubstituido}\n`;
  resumo += '\n*Músicas cadastradas:*\n';
  (cache.musicas || []).forEach((m, i) => {
    resumo += ` ${i + 1}. ${m.nome || '?'} — ${m.tipo || '?'} / ${m.formato || '?'}\n`;
  });
  enviarMensagemTelegramAlbuns(threadId, resumo, { inline_keyboard: [
    [{ text: '✅ Confirmar', callback_data: 'alb_confirmar' }],
    [{ text: '❌ Cancelar',  callback_data: 'alb_cancelar'  }]
  ]});
}

function gravarRegistroFinalAlbum(cache, threadId) {
  const ss = SpreadsheetApp.openById(EXT_SPREADSHEET_ID);
  const abaAlbuns = ss.getSheetByName('EDIÇÃO CHARTS ÁLBUMS');
  const abaCharts = ss.getSheetByName('EDIÇÃO CHARTS');
  const hoje = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'dd/MM/yyyy');

  const fator = (['EP','ALBUM','DELUXE'].includes((cache.tipoLancamento || '').toUpperCase())) ? 2 : 1;

  let linhaAlbum;
  if (cache.modoAlbum === 'substituicao' && cache.albumSubstituido) {
    const dadosAlb = abaAlbuns.getDataRange().getValues();
    for (let i = 1; i < dadosAlb.length; i++) {
      if (String(dadosAlb[i][3]).trim().toLowerCase() === cache.albumSubstituido.trim().toLowerCase()) {
        linhaAlbum = i + 1; break;
      }
    }
  }
  if (!linhaAlbum) {
    const dadosAlb = abaAlbuns.getDataRange().getValues();
    for (let i = 1; i < dadosAlb.length; i++) {
      if (!dadosAlb[i][3]) { linhaAlbum = i + 1; break; }
    }
    if (!linhaAlbum) linhaAlbum = abaAlbuns.getLastRow() + 1;
  }

  abaAlbuns.getRange(linhaAlbum, 1).setValue(cache.artistaPrincipal || '');
  abaAlbuns.getRange(linhaAlbum, 3).setValue(1);
  abaAlbuns.getRange(linhaAlbum, 4).setValue(cache.titulo);
  abaAlbuns.getRange(linhaAlbum, 5).setValue(cache.qtdMusicas || 0);
  abaAlbuns.getRange(linhaAlbum, 6).setValue(fator);

  const dadosCharts = abaCharts.getDataRange().getValues();
  (cache.musicas || []).forEach(m => {
    if (!m.nome) return;
    if (m.tipo === 'JÁ EXISTE') {
      for (let i = 1; i < dadosCharts.length; i++) {
        if (String(dadosCharts[i][1]).trim().toLowerCase() === m.nome.trim().toLowerCase()) {
          abaCharts.getRange(i + 1, 5).setValue(cache.titulo);
          break;
        }
      }
    } else {
      let prVazia = 0;
      for (let i = 1; i < dadosCharts.length; i++) {
        if (!dadosCharts[i][1]) { prVazia = i + 1; break; }
      }
      if (prVazia === 0) prVazia = dadosCharts.length + 1;
      abaCharts.getRange(prVazia, 1).setValue(hoje);
      abaCharts.getRange(prVazia, 2).setValue(m.nome);
      abaCharts.getRange(prVazia, 3).setValue(m.tipo);
      abaCharts.getRange(prVazia, 4).setValue(m.formato || '');
      abaCharts.getRange(prVazia, 5).setValue(cache.titulo);
      abaCharts.getRange(prVazia, 6).setValue(1);
      dadosCharts.push(['','','','','','']); 
    }
  });

  const ssLocal = SpreadsheetApp.getActiveSpreadsheet();
  const abaLocal = ssLocal.getSheetByName('Álbuns') || ssLocal.getSheetByName('Albuns') || ssLocal.insertSheet('Álbuns');
  abaLocal.appendRow([cache.titulo, threadId, cache.artistaPrincipal, hoje]);
}

function verificarComentarioMetacriticAlbum(msg) {
  const threadId = msg.message_thread_id;
  const userId = msg.from.id;
  if (!threadId) return;
  const sheet = (SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Álbuns') ||
                 SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Albuns'));
  if (!sheet) return;
  const data = sheet.getDataRange().getValues();
  let registrado = false, eCriador = false;
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][1]) === String(threadId)) {
      registrado = true;
      if (String(data[i][2]) === String(userId)) eCriador = true;
      break;
    }
  }
  if (!registrado || eCriador) return;
  if (jaVotouMetacriticAlbum(userId, threadId)) return;
  const txt = '📊 *Analisando para o Metacritic, qual nota você dá a este álbum?*';
  const botoes = [
    [{ text: '45 a 60', callback_data: 'alb_meta_45_60' }, { text: '61 a 75', callback_data: 'alb_meta_61_75' }],
    [{ text: '76 a 90', callback_data: 'alb_meta_76_90' }, { text: '91 a 100', callback_data: 'alb_meta_91_100' }]
  ];
  enviarMensagemTelegramAlbuns(threadId, txt, { inline_keyboard: botoes });
}

function processarVotoMetacriticAlbum(data, threadId, userId, messageId) {
  try {
    deletarMensagemTelegramAlbuns(messageId);
    const partes = data.split('_');
    const min = parseInt(partes[2]);
    const max = parseInt(partes[3]);
    const nota = Math.floor(Math.random() * (max - min + 1)) + min;
    registrarVotoMetacriticAlbumControle(userId, threadId, nota);
    const nomeOff = obterNomeOff(userId);
    const nomeTopico = registrarNotaEMediaAlbuns(threadId, nota, nomeOff);
    if (nomeTopico) registrarComentarioExterno(nomeOff, nomeTopico);
  } catch(e) {
    enviarMensagemTelegramAlbuns(threadId, `❌ *Erro interno:* ${e.message}`);
  }
}

function registrarNotaEMediaAlbuns(threadId, nota, nomeOff) {
  const sheet = (SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Álbuns') ||
                 SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Albuns'));
  if (!sheet) return null;
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][1]) === String(threadId)) {
      let atual = data[i][4] || '';
      let nova = atual ? atual + ', ' + nomeOff + ': ' + nota : nomeOff + ': ' + nota;
      let soma = 0, qtd = 0;
      nova.split(', ').forEach(e => {
        let p = e.split(': ');
        if (p.length === 2 && !isNaN(parseInt(p[1]))) { soma += parseInt(p[1]); qtd++; }
      });
      sheet.getRange(i + 1, 5).setValue(nova);
      sheet.getRange(i + 1, 6).setValue(qtd > 0 ? Math.round(soma / qtd) : 0);
      return data[i][0];
    }
  }
  return null;
}

function processarTextoPuroAlbuns(msg) {
  const userId = msg.from.id;
  const threadId = msg.message_thread_id;
  let cache = obterCache(userId, threadId);
  if (!cache) return false;

  if (cache.aguardandoQtdMusicas) {
    const qtd = parseInt(msg.text);
    if (isNaN(qtd) || qtd < 1) {
      enviarMensagemTelegramAlbuns(threadId, '⚠️ Digite um número válido.');
      return true;
    }
    if (cache.idMsgQtd) { deletarMensagemTelegramAlbuns(cache.idMsgQtd); delete cache.idMsgQtd; }
    deletarMensagemTelegramAlbuns(msg.message_id);
    cache.qtdMusicas = qtd;
    cache.musicas = [];
    delete cache.aguardandoQtdMusicas;
    cache.aguardandoNomeMusica = 0;
    salvarCache(userId, threadId, cache);
    const r = enviarMensagemTelegramAlbuns(threadId, '✏️ *Digite o nome da Música 1:*');
    if (r && r.ok) cache.idMsgNomeMusica = r.result.message_id;
    salvarCache(userId, threadId, cache);
    return true;
  }

  if (typeof cache.aguardandoNomeMusica === 'number') {
    const indice = cache.aguardandoNomeMusica;
    if (cache.idMsgNomeMusica) { deletarMensagemTelegramAlbuns(cache.idMsgNomeMusica); delete cache.idMsgNomeMusica; }
    deletarMensagemTelegramAlbuns(msg.message_id);
    cache.musicas = cache.musicas || [];
    cache.musicas[indice] = { nome: msg.text };
    delete cache.aguardandoNomeMusica;
    salvarCache(userId, threadId, cache);
    perguntarTipoEntradaMusica(threadId, indice);
    return true;
  }

  if (cache.aguardandoArtistaManuaAlbum) {
    deletarMensagemTelegramAlbuns(msg.message_id);
    cache.artistaPrincipal = msg.text;
    delete cache.aguardandoArtistaManuaAlbum;
    salvarCache(userId, threadId, cache);
    const r2 = enviarMensagemTelegramAlbuns(threadId, '🔢 *Quantas músicas tem o projeto?* (somente o número)');
    if (r2 && r2.ok) cache.idMsgQtd = r2.result.message_id;
    cache.aguardandoQtdMusicas = true;
    salvarCache(userId, threadId, cache);
    return true;
  }

  return false;
}


// ==========================================
// IMPORTAÇÕES EM LOTE (MANUAL / LEGAÇO)
// ==========================================

function etapa1_ImportarTopicosVideos() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let abaAtuais = ss.getSheetByName('Atuais_Vídeos') || ss.insertSheet('Atuais_Vídeos');
  
  abaAtuais.clear();
  abaAtuais.getRange("A1:D1").setValues([["Nome Original", "ID do Tópico", "ID do Criador", "Status"]]).setFontWeight("bold");

  try {
    const arquivo = DriveApp.getFileById(ID_ARQUIVO_DRIVE_VIDEOS);
    const conteudo = JSON.parse(arquivo.getBlob().getDataAsString());
    const mensagens = conteudo.messages || [];
    const listaTopicos = [];

    mensagens.forEach(msg => {
      if (msg.type === 'service' && msg.action === 'topic_created') {
        const criadorId = msg.actor_id ? msg.actor_id.replace('user', '') : '';
        listaTopicos.push([msg.title, msg.id, criadorId, ""]);
      }
    });

    if (listaTopicos.length > 0) {
      abaAtuais.getRange(2, 1, listaTopicos.length, 4).setValues(listaTopicos);
      SpreadsheetApp.flush();
      Logger.log(`✅ Sucesso! ${listaTopicos.length} tópicos de vídeos importados para a aba "Atuais_Vídeos".`);
    } else {
      Logger.log('❌ Nenhum tópico detectado no JSON de vídeos.');
    }
  } catch (erro) {
    Logger.log(`❌ Erro na importação: ${erro.message}`);
  }
}

function etapa2_ProcessarEAtualizarVideos() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const abaAtuais = ss.getSheetByName("Atuais_Vídeos");
  let abaVideos = ss.getSheetByName("Vídeos") || ss.insertSheet("Vídeos");

  const ultimaLinha = abaAtuais.getLastRow();
  if (ultimaLinha < 2) {
    Logger.log("⚠ A aba 'Atuais_Vídeos' está vazia.");
    return;
  }

  if (abaVideos.getLastRow() === 0) {
    abaVideos.getRange("A1:C1").setValues([["Novo Nome", "ID do Tópico", "ID do Criador"]]).setFontWeight("bold");
  }

  const tempoInicio = Date.now();
  const limiteTempo = 5.5 * 60 * 1000; 

  const dados = abaAtuais.getRange(2, 1, ultimaLinha - 1, 4).getValues();
  let processadosNestaRodada = 0;

  for (let i = 0; i < dados.length; i++) {
    if (Date.now() - tempoInicio > limiteTempo) {
      Logger.log("⏳ Limite de tempo próximo! O script pausou. Rode a função novamente para continuar de onde parou.");
      return; 
    }

    const nomeOriginal = dados[i][0];
    const topicoId = dados[i][1];
    const criadorId = dados[i][2];
    const status = dados[i][3]; 

    if (status === "Concluído") continue;

    let nomeFinal = nomeOriginal;

    if (nomeOriginal.includes('|')) {
      nomeFinal = nomeOriginal.split('|')[1].trim(); 
      
      const resultadoAPI = enviarEdicaoTelegramVideos(topicoId, nomeFinal);
      
      if (resultadoAPI.ok) {
        Logger.log(`✨ Vídeo Editado: ${nomeOriginal} -> ${nomeFinal}`);
      } else {
        Logger.log(`❌ Falha em: "${nomeOriginal}". Motivo: ${resultadoAPI.descricao}`);
        nomeFinal = nomeFinal + ` (Erro: ${resultadoAPI.descricao})`;
      }
      
      Utilities.sleep(3000); 
    }

    abaVideos.appendRow([nomeFinal, topicoId, criadorId]);
    abaAtuais.getRange(i + 2, 4).setValue("Concluído");
    processadosNestaRodada++;
  }

  Logger.log(`🏆 Processamento finalizado! ${processadosNestaRodada} tópicos de vídeos alterados nesta rodada.`);
}

function enviarEdicaoTelegramVideos(threadId, novoNome) {
  const url = `https://api.telegram.org/bot${BOT_TOKEN_VIDEOS}/editForumTopic`;
  const payload = { chat_id: CHAT_ID_VIDEOS, message_thread_id: threadId, name: novoNome };
  const options = { method: 'post', contentType: 'application/json', payload: JSON.stringify(payload), muteHttpExceptions: true };

  try {
    const reply = UrlFetchApp.fetch(url, options);
    const json = JSON.parse(reply.getContentText());
    return { ok: json.ok, descricao: json.description || "Erro" };
  } catch (e) {
    return { ok: false, description: e.message };
  }
}

function mapearVideosParaCharts() {
  const ssAtivo = SpreadsheetApp.getActiveSpreadsheet();
  const abaVideosAtiva = ssAtivo.getSheetByName("Vídeos") || ssAtivo.getSheetByName("Videos");
  
  if (!abaVideosAtiva) {
    Logger.log("❌ Erro: Aba 'Vídeos' não encontrada nesta planilha.");
    return;
  }
  
  const ultimaLinhaAtiva = abaVideosAtiva.getLastRow();
  if (ultimaLinhaAtiva < 2) {
    Logger.log("⚠ A aba 'Vídeos' está vazia ou contém apenas o cabeçalho.");
    return;
  }
  
  const nomesVideosLocais = abaVideosAtiva.getRange(2, 1, ultimaLinhaAtiva - 1, 1).getValues();
  
  const idPlanilhaCharts = "1GPajSCp1TkJDEDOGZIrXxgZuNuRs7545buFntyDlpL8";
  let abaCharts;
  try {
    const ssCharts = SpreadsheetApp.openById(idPlanilhaCharts);
    abaCharts = ssCharts.getSheetByName("EDIÇÃO CHARTS"); 
  } catch(e) {
    Logger.log("❌ Erro ao acessar a planilha de CHARTS: " + e.message);
    return;
  }
  
  if (!abaCharts) {
    Logger.log("❌ Erro: Aba 'EDIÇÃO CHARTS' não foi encontrada na planilha externa.");
    return;
  }
  
  const dadosChartsB = abaCharts.getRange(2, 2, abaCharts.getLastRow() - 1, 1).getValues();
  
  const idPlanilhaDestino = "1zMqnIntj5vAlU4_V_s0xf5suPTtFcl61W9DC9j8LFfM";
  let abaDestino;
  try {
    const ssDestino = SpreadsheetApp.openById(idPlanilhaDestino);
    abaDestino = ssDestino.getSheetByName("Vídeos") || ssDestino.getSheetByName("Videos") || ssDestino.insertSheet("Vídeos");
  } catch(e) {
    Logger.log("❌ Erro ao acessar a planilha de destino (Jogadores): " + e.message);
    return;
  }
  
  if (abaDestino.getLastRow() === 0) {
    abaDestino.getRange("D1").setValue("Música Correspondente").setFontWeight("bold");
  }

  const resultadoColunaD = [];
  
  for (let i = 0; i < nomesVideosLocais.length; i++) {
    const videoLocalPuro = String(nomesVideosLocais[i][0]).trim();
    const videoLocalMinusculo = videoLocalPuro.toLowerCase();
    let correspondenciaOficial = ""; 
    
    if (videoLocalMinusculo !== "") {
      for (let j = 0; j < dadosChartsB.length; j++) {
        const chartPuro = String(dadosChartsB[j][0]).trim();
        const chartMinusculo = chartPuro.toLowerCase();
        
        if (chartMinusculo === videoLocalMinusculo || 
            chartMinusculo.includes(videoLocalMinusculo) || 
            videoLocalMinusculo.includes(chartMinusculo)) {
          correspondenciaOficial = chartPuro; 
          break; 
        }
      }
    }
    resultadoColunaD.push([correspondenciaOficial]);
  }
  
  if (resultadoColunaD.length > 0) {
    abaDestino.getRange(2, 4, resultadoColunaD.length, 1).setValues(resultadoColunaD);
    Logger.log(`🏆 Concluído! ${resultadoColunaD.length} linhas analisadas e atualizadas na coluna D da planilha externa.`);
  }
}

function etapa1_ImportarTopicosAlbuns() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let abaAtuais = ss.getSheetByName('Atuais_Albuns') || ss.insertSheet('Atuais_Albuns');
  abaAtuais.clear();
  abaAtuais.getRange('A1:D1').setValues([['Nome Original', 'ID do Tópico', 'ID do Criador', 'Status']]).setFontWeight('bold');

  try {
    const arquivo = DriveApp.getFileById(ID_ARQUIVO_DRIVE_ALBUNS);
    const conteudo = JSON.parse(arquivo.getBlob().getDataAsString());
    const mensagens = conteudo.messages || [];
    const lista = [];
    mensagens.forEach(msg => {
      if (msg.type === 'service' && msg.action === 'topic_created') {
        const criadorId = msg.actor_id ? msg.actor_id.replace('user', '') : '';
        lista.push([msg.title, msg.id, criadorId, '']);
      }
    });
    if (lista.length > 0) {
      abaAtuais.getRange(2, 1, lista.length, 4).setValues(lista);
      SpreadsheetApp.flush();
      Logger.log(`✅ ${lista.length} tópicos de álbuns importados.`);
    } else {
      Logger.log('❌ Nenhum tópico detectado no JSON de álbuns.');
    }
  } catch(e) { Logger.log('❌ Erro: ' + e.message); }
}

function etapa2_ProcessarEAtualizarAlbuns() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const abaAtuais = ss.getSheetByName('Atuais_Albuns');
  let abaAlbuns = ss.getSheetByName('Álbuns') || ss.getSheetByName('Albuns') || ss.insertSheet('Álbuns');

  const ultimaLinha = abaAtuais.getLastRow();
  if (ultimaLinha < 2) { Logger.log("⚠ Aba 'Atuais_Albuns' vazia."); return; }
  if (abaAlbuns.getLastRow() === 0) {
    abaAlbuns.getRange('A1:D1').setValues([['Título', 'ID do Tópico', 'ID do Criador', 'Status']]).setFontWeight('bold');
  }

  const tempoInicio = Date.now();
  const limite = 5.5 * 60 * 1000;
  const dados = abaAtuais.getRange(2, 1, ultimaLinha - 1, 4).getValues();
  let processados = 0;

  for (let i = 0; i < dados.length; i++) {
    if (Date.now() - tempoInicio > limite) {
      Logger.log('⏳ Tempo esgotado — rode novamente para continuar.'); return;
    }
    if (dados[i][3] === 'Concluído') continue;
    let nomeFinal = dados[i][0];
    if (String(nomeFinal).includes('|')) {
      nomeFinal = String(nomeFinal).split('|')[1].trim();
      const res = editarTopicoTelegramAlbuns(dados[i][1], nomeFinal);
      if (!res.ok) { nomeFinal += ` (Erro: ${res.descricao})`; Logger.log('❌ ' + nomeFinal); }
      else Logger.log('✨ ' + dados[i][0] + ' → ' + nomeFinal);
      Utilities.sleep(3000);
    }
    abaAlbuns.appendRow([nomeFinal, dados[i][1], dados[i][2], '']);
    abaAtuais.getRange(i + 2, 4).setValue('Concluído');
    processados++;
  }
  Logger.log(`🏆 ${processados} álbuns processados.`);
}

function editarTopicoTelegramAlbuns(threadId, novoNome) {
  const url = `https://api.telegram.org/bot${BOT_TOKEN}/editForumTopic`;
  const options = {
    method: 'post', contentType: 'application/json',
    payload: JSON.stringify({ chat_id: CHAT_ID_ALBUNS, message_thread_id: threadId, name: novoNome }),
    muteHttpExceptions: true
  };
  try {
    const r = JSON.parse(UrlFetchApp.fetch(url, options).getContentText());
    return { ok: r.ok, descricao: r.description || 'Erro' };
  } catch(e) { return { ok: false, descricao: e.message }; }
}

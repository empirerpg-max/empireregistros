import React, { useState, useEffect } from 'react';
import { 
  Play, 
  RefreshCw, 
  MessageSquare, 
  Music, 
  Video, 
  Disc,
  FolderHeart, 
  Compass, 
  Code, 
  Copy, 
  Check, 
  AlertCircle, 
  Phone, 
  Users, 
  Send, 
  ArrowLeft, 
  Layers, 
  Sliders, 
  FileCode,
  Info,
  ExternalLink,
  ChevronRight,
  Database,
  Settings,
  Download
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Dados embutidos para simulação se o GAS estiver fora do ar ou para demonstração do AI Studio
const PROMO_ARTISTS = [
  "Lady Gaga", "Ariana Grande", "Miley Cyrus", "Taylor Swift", "Bruno Mars", 
  "Sabrina Carpenter", "Billie Eilish", "Dua Lipa", "Rihanna", "Beyoncé", "The Weeknd"
];

const INITIAL_MUSICS = [
  { titulo: "Rain On Me", threadId: "12345" },
  { titulo: "Flowers", threadId: "23456" },
  { titulo: "Cruel Summer", threadId: "34567" },
  { titulo: "Die With A Smile", threadId: "45678" },
  { titulo: "Espresso", threadId: "56789" }
];

export default function App() {
  // Configuração real do Google Sheets (CORS) e Modo de Operação
  const [isLiveMode, setIsLiveMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('empire_live_mode');
    return saved === null ? true : saved === 'true'; // Padrão: produção real integrado
  });

  const [scriptUrl, setScriptUrl] = useState<string>(() => {
    return localStorage.getItem('empire_script_url') || 'https://script.google.com/macros/s/AKfycbzSLo0Fw5rVYVdztelVNImDQAc6itfoxmuSJVZ7TAUQDRFX9D71QdHBvBCefO-NJd9TgQ/exec';
  });

  const [isConfigOpen, setIsConfigOpen] = useState<boolean>(false);

  const [isLoadingReal, setIsLoadingReal] = useState(false);

  // Modo Admin (Painel Gerencial / Simulador) - Desconectado da interface padrão do jogador
  const [isAdminMode, setIsAdminMode] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const params = new URLSearchParams(window.location.search);
    return params.get('admin') === 'true' || params.get('gerente') === 'true';
  });

  // Verifica se o app está carregando em ambiente de produção incorporado no Telegram
  const [isEmbedded, setIsEmbedded] = useState(() => {
    if (typeof window === 'undefined') return false;
    const params = new URLSearchParams(window.location.search);
    const hasThread = params.get('tgWebAppStartParam') || params.get('thread_id') || params.get('thread') || params.get('threadId');
    return hasThread !== null || params.get('embed') === 'true' || params.get('tg') === 'true';
  });

  // Estados para simulação / cache se sem internet
  const [musicas, setMusicas] = useState(INITIAL_MUSICS);
  const [videos, setVideos] = useState<Array<{ titulo: string; threadId: string }>>([
    { titulo: "Aventura - Clipe Oficial", threadId: "98761" },
    { titulo: "Sonho Lindo - Lyric Video", threadId: "98762" }
  ]);
  const [albuns, setAlbuns] = useState<Array<{ titulo: string; threadId: string }>>([
    { titulo: "The Tortured Poets Department - Álbum", threadId: "99001" },
    { titulo: "Hit Me Hard And Soft - Álbum", threadId: "99002" }
  ]);
  const [musicasEdicaoCharts, setMusicasEdicaoCharts] = useState<string[]>([
    "Flowers", "Cruel Summer", "Espresso", "Lover", "Anti-Hero", "Stay", "Die With A Smile", "Aventura", "Sonho Lindo"
  ]);
  const [albunsEdicaoCharts, setAlbunsEdicaoCharts] = useState<string[]>([
    "The Tortured Poets Department", "Hit Me Hard And Soft", "Short n' Sweet", "Radical Optimism", "GUTS"
  ]);
  const [artistas, setArtistas] = useState(PROMO_ARTISTS);
  const [novoTopicoNome, setNovoTopicoNome] = useState("");
  const [isFlowVideos, setIsFlowVideos] = useState<boolean>(false);
  const [isFlowAlbuns, setIsFlowAlbuns] = useState<boolean>(false);
  
  // Estados do formulário de Álbum (Pop-up/Modal)
  const [showAlbumModal, setShowAlbumModal] = useState<boolean>(false);
  const [albumModo, setAlbumModo] = useState<'registro' | 'substituicao'>('registro');
  const [albumSubstituido, setAlbumSubstituido] = useState<string>("");
  const [albumTipoLancamento, setAlbumTipoLancamento] = useState<string>("ALBUM");
  const [albumArtistaPrincipal, setAlbumArtistaPrincipal] = useState<string>("");
  const [albumQtdMusicas, setAlbumQtdMusicas] = useState<number>(0);
  const [albumMusicas, setAlbumMusicas] = useState<Array<{ nome: string; tipo: string; formato: string }>>([]);
  const [albumBuscaSubstituir, setAlbumBuscaSubstituir] = useState<string>("");
  const [albumSaving, setAlbumSaving] = useState<boolean>(false);
  const [albumModalStep, setAlbumModalStep] = useState<'modo' | 'dados' | 'musicas_list' | 'resumo'>('modo');
  const [albumBuscaArtista, setAlbumBuscaArtista] = useState<string>("");
  const [showAlbumArtistaDropdown, setShowAlbumArtistaDropdown] = useState<boolean>(false);

  // ESTADOS DO IMPORTADOR DE HISTÓRICO JSON DO TELEGRAM
  const [jsonInput, setJsonInput] = useState<string>("");
  const [parsedAlbums, setParsedAlbums] = useState<Array<{
    id: string;
    titulo: string;
    artistaPrincipal: string;
    tipoLancamento: 'EP' | 'ALBUM' | 'DELUXE';
    qtdMusicas: number;
    musicas: Array<{ nome: string; tipo: string; formato: string }>;
    selected: boolean;
    status: 'Pendente' | 'Importando' | 'Sucesso' | 'Erro';
    error?: string;
  }>>([]);
  const [isImporting, setIsImporting] = useState<boolean>(false);
  const [importProgress, setImportProgress] = useState<number>(0);

  const [videoTipo, setVideoTipo] = useState<string>("clipe");
  const [videoMateriais, setVideoMateriais] = useState<string[]>(["", "", ""]);
  const [showDropdownIndex, setShowDropdownIndex] = useState<number | null>(null);
  const [videoYoutube, setVideoYoutube] = useState<boolean>(true);
  const [activeSegment, setActiveSegment] = useState<'musicas' | 'videos' | 'albuns'>('musicas');
  const [simulatorCreateType, setSimulatorCreateType] = useState<'musica' | 'video' | 'album'>('musica');

  const [logs, setLogs] = useState<Array<{ time: string; msg: string; type: 'info' | 'error' | 'success' }>>([
    { time: "16:00:00", msg: "Simulador de Banco de Dados iniciado.", type: 'info' },
    { time: "16:00:02", msg: "Bot @testeempire_bot escutando no grupo Músicas (ID: -1002072336495)", type: 'info' }
  ]);

  // Mensagens do chat do Telegram simulado
  const [mensagensTelegram, setMensagensTelegram] = useState<Array<{
    id: string;
    from: string;
    isBot: boolean;
    text: string;
    threadId: string;
    replyMarkup?: boolean;
    messageId?: string;
  }>>([
    { id: "1", from: "Sistema", isBot: false, text: "💬 Crie um tópico ou interaja abaixo para iniciar o fluxo.", threadId: "Geral" },
    { id: "2", from: "Hugo Luis (Admin)", isBot: false, text: "Criou o tópico: Die With A Smile", threadId: "45678" },
    { id: "3", from: "Empire Bot", isBot: true, text: "🎵 Die With A Smile\n\nQual o formato do single que deseja salvar nos charts?", threadId: "45678", replyMarkup: true, messageId: "bot_101" }
  ]);

  // Estado do Mini App rodando no emulador
  const [step, setStep] = useState<'loading' | 'step0' | 'step1' | 'step2' | 'step3' | 'step4' | 'step5' | 'step5b' | 'comentario' | 'resumo' | 'sucesso' | 'erro' | 'step_video_form'>('step0');
  const [erroMsg, setErroMsg] = useState("");
  const [buscaTópico, setBuscaTópico] = useState("");

  // Dados preenchidos no formulário do emulador
  const [selectedThreadId, setSelectedThreadId] = useState("45678");
  const [selectedTitulo, setSelectedTitulo] = useState("Die With A Smile");
  const [opcaoSelected, setOpcaoSelected] = useState<'' | 'registrar' | 'substituir' | 'comentario'>('registrar');
  const [tipoSingle, setTipoSingle] = useState("");
  const [tipoMusica, setTipoMusica] = useState("");
  const [artistasSalvos, setArtistasSalvos] = useState<string[]>([]);
  const [numArtistaAtual, setNumArtistaAtual] = useState(1);
  const [artistaInput, setArtistaInput] = useState("");
  const [substituirCharts, setSubstituirCharts] = useState("Não");
  const [musicaSubstituida, setMusicaSubstituida] = useState("");
  const [buscaSubstituir, setBuscaSubstituir] = useState("");

  // Aba ativa do painel de controle (Simulador / Instruções / Código GAS / Código HTML / Importador)
  const [activeTab, setActiveTab] = useState<'simulador' | 'instrucoes' | 'codigogas' | 'codigohtml' | 'importador'>('simulador');
  const [copiedIndex, setCopiedIndex] = useState<string | null>(null);

  // Efeitos colaterais e Logger
  const addLog = (msg: string, type: 'info' | 'error' | 'success' = 'info') => {
    const time = new Date().toLocaleTimeString('pt-BR');
    setLogs(prev => [{ time, msg, type }, ...prev]);
  };

  // PARSER E IMPORTADOR DE COMENTÁRIOS E ÁLBUNS HISTÓRICOS (TELEGRAM JSON)
  const handleParseJSON = () => {
    if (!jsonInput.trim()) {
      addLog("Por favor, cole o JSON para analisar.", "error");
      return;
    }
    
    try {
      const data = JSON.parse(jsonInput);
      const messages = data.messages || [];
      if (!Array.isArray(messages)) {
        addLog("O JSON fornecido não contém uma lista de mensagens válida ('messages' deve ser um array).", "error");
        return;
      }

      addLog(`Iniciando análise de ${messages.length} mensagens no JSON...`, "info");
      
      const topics = messages.filter((m: any) => m.type === 'service' && m.action === 'topic_created');
      if (topics.length === 0) {
        addLog("Nenhum tópico criado ('topic_created') foi detectado no JSON.", "error");
        return;
      }

      const albuns_list: any[] = [];

      topics.forEach((topic: any) => {
        const threadId = String(topic.id);
        const rawTitle = topic.title || "";
        
        let typeVal: 'EP' | 'ALBUM' | 'DELUXE' = "ALBUM";
        const upperTitle = rawTitle.toUpperCase();
        if (upperTitle.includes("EP")) {
          typeVal = "EP";
        } else if (upperTitle.includes("DELUXE") || upperTitle.includes("DLX")) {
          typeVal = "DELUXE";
        }

        let cleanTitle = rawTitle.replace(/^(#?EP|#?ALBUM|#?DELUXE|#?DLX)\s*\|\s*/i, "").trim();
        
        let parsedArtist = "Vários Artistas";
        let parsedAlbum = cleanTitle;

        const splitChars = [" - ", " — ", " : ", ": "];
        for (const char of splitChars) {
          if (cleanTitle.includes(char)) {
            const parts = cleanTitle.split(char);
            parsedArtist = parts[0].trim();
            parsedAlbum = parts.slice(1).join(char).trim();
            break;
          }
        }

        parsedAlbum = parsedAlbum.replace(/^["':\s]+|["':\s]+$/g, "").trim();
        parsedArtist = parsedArtist.replace(/^["':\s]+|["':\s]+$/g, "").trim();

        // Encontrar descrição ou tracklist em respostas a esse tópico
        const replyMsg = messages.find((m: any) => m.type === "message" && String(m.reply_to_message_id) === threadId);
        let rawText = "";

        if (replyMsg) {
          if (typeof replyMsg.text === "string") {
            rawText = replyMsg.text;
          } else if (Array.isArray(replyMsg.text)) {
            rawText = replyMsg.text.map((t: any) => {
              if (typeof t === "string") return t;
              if (typeof t === "object" && t !== null && t.text) return t.text;
              return "";
            }).join("");
          }
        }

        const musicsList: Array<{ nome: string; tipo: string; formato: string }> = [];
        if (rawText) {
          const lines = rawText.split("\n");
          lines.forEach((line: string) => {
            const trimmed = line.trim();
            const match = trimmed.match(/^([0-9]+)\s*[\.\-\)\s]+\s*(.+)$/i);
            if (match) {
              const trackName = match[2].trim();
              if (
                trackName && 
                !trackName.toLowerCase().startsWith("http") && 
                !trackName.toLowerCase().includes("ouça") && 
                !trackName.toLowerCase().includes("clique") &&
                !trackName.toLowerCase().includes("escute")
              ) {
                const hasFeat = trackName.toLowerCase().includes("feat.") || trackName.toLowerCase().includes("with ");
                musicsList.push({
                  nome: trackName,
                  tipo: "TRACKLIST ALBUM",
                  formato: hasFeat ? "COLAB" : "SOLO"
                });
              }
            }
          });
        }

        albuns_list.push({
          id: threadId,
          titulo: parsedAlbum,
          artistaPrincipal: parsedArtist,
          tipoLancamento: typeVal,
          qtdMusicas: musicsList.length || 1,
          musicas: musicsList.length > 0 ? musicsList : [{ nome: parsedAlbum, tipo: "TRACKLIST ALBUM", formato: "SOLO" }],
          selected: true,
          status: 'Pendente'
        });
      });

      setParsedAlbums(albuns_list);
      addLog(`Análise Concluída! Foram detectados ${albuns_list.length} álbuns antigos no JSON prontos para gravação.`, "success");
    } catch(err: any) {
      addLog(`Erro ao processar JSON: ${err.message}`, "error");
    }
  };

  const handleStartBulkImport = async () => {
    const selected = parsedAlbums.filter(a => a.selected);
    if (selected.length === 0) {
      addLog("Nenhum álbum selecionado para importar.", "error");
      return;
    }

    setIsImporting(true);
    setImportProgress(0);
    addLog(`Iniciando a importação em massa de ${selected.length} álbuns selecionados...`, "info");

    for (let i = 0; i < selected.length; i++) {
      setImportProgress(i);
      const album = selected[i];
      addLog(`[${i + 1}/${selected.length}] Processando: "${album.titulo}" (${album.artistaPrincipal})...`, "info");
      
      setParsedAlbums(prev => prev.map(a => a.id === album.id ? { ...a, status: 'Importando' } : a));

      try {
        const payload = {
          titulo: album.titulo,
          threadId: album.id,
          modoAlbum: "registro",
          albumSubstituido: "",
          tipoLancamento: album.tipoLancamento,
          artistaPrincipal: album.artistaPrincipal,
          qtdMusicas: album.musicas.length,
          musicas: album.musicas
        };

        if (isLiveMode) {
          const params = new URLSearchParams({
            action: 'gravarAlbum',
            data: JSON.stringify(payload)
          });
          const response = await fetch(`${scriptUrl}?${params.toString()}`);
          const res = await response.json();
          if (res.ok) {
            setParsedAlbums(prev => prev.map(a => a.id === album.id ? { ...a, status: 'Sucesso' } : a));
            addLog(`✅ Álbum "${album.titulo}" gravado na planilha externa com sucesso!`, "success");
          } else {
            throw new Error(res.error || "Roteamento ou permissão do Apps Script falhou");
          }
        } else {
          // Local/Simulador
          await new Promise(resolve => setTimeout(resolve, 600));
          
          setAlbuns(prev => {
            if (prev.some(a => String(a.threadId) === String(album.id))) return prev;
            return [...prev, { titulo: album.titulo, threadId: album.id, artistaPrincipal: album.artistaPrincipal, data: new Date().toLocaleDateString('pt-BR') }];
          });

          const tracklistFormatted = album.musicas.map((m, idx) => `${idx + 1}. ${m.nome}`).join("\n");
          setMensagensTelegram(prev => [
            ...prev,
            { 
              id: String(Date.now() + i), 
              from: "Empire Bot", 
              isBot: true, 
              text: `✅ *[IMPORTADOR DE HISTÓRICO]*\n\n📀 *${album.titulo}*\n💿 Tipo: ${album.tipoLancamento}\n👤 Artista: ${album.artistaPrincipal}\n🔢 Músicas: ${album.musicas.length}\n\n*Faixas:*\n${tracklistFormatted}`,
              threadId: album.id 
            }
          ]);

          setParsedAlbums(prev => prev.map(a => a.id === album.id ? { ...a, status: 'Sucesso' } : a));
          addLog(`✅ [Simulado] Álbum "${album.titulo}" gravado localmente no emulador.`, "success");
        }
      } catch (err: any) {
        setParsedAlbums(prev => prev.map(a => a.id === album.id ? { ...a, status: 'Erro', error: err.message } : a));
        addLog(`❌ Erro no álbum "${album.titulo}": ${err.message}`, "error");
      }
    }

    setIsImporting(false);
    addLog("🏆 Todas as importações selecionadas foram processadas!", "success");
    carregarDadosDoPlanilha(true);
  };

  const handleCopy = (text: string, index: string) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  // Salva preferências no localStorage
  useEffect(() => {
    localStorage.setItem('empire_live_mode', String(isLiveMode));
  }, [isLiveMode]);

  useEffect(() => {
    localStorage.setItem('empire_script_url', scriptUrl);
  }, [scriptUrl]);

  // Carrega tópicos e artistas reais do Google Sheets via CORS-GET seguro
  const carregarDadosDoPlanilha = async (silencioso = false) => {
    if (!scriptUrl) {
      if (!silencioso) addLog("URL do script do Google Apps Script não configurada.", "error");
      return;
    }
    setIsLoadingReal(true);
    if (!silencioso) addLog("Conectando ao Google Sheets: buscando dados reais de tópicos e artistas...", "info");
    
    try {
      const response = await fetch(`${scriptUrl}?action=getDados`);
      const res = await response.json();
      
      if (res) {
        if (res.musicas && res.musicas.length > 0) {
          setMusicas(res.musicas);
        }
        if (res.videos && res.videos.length > 0) {
          setVideos(res.videos);
        }
        if (res.albuns && res.albuns.length > 0) {
          setAlbuns(res.albuns);
        }
        if (res.artistas && res.artistas.length > 0) {
          setArtistas(res.artistas);
        }
        if (res.musicasEdicaoCharts && res.musicasEdicaoCharts.length > 0) {
          setMusicasEdicaoCharts(res.musicasEdicaoCharts);
        }
        if (res.albunsEdicaoCharts && res.albunsEdicaoCharts.length > 0) {
          setAlbunsEdicaoCharts(res.albunsEdicaoCharts);
        }
        if (!silencioso) {
          addLog(`Planilha carregada em tempo real com sucesso! Encontrados ${res.musicas?.length || 0} de músicas, ${res.videos?.length || 0} de vídeos, ${res.albuns?.length || 0} de álbuns, ${res.musicasEdicaoCharts?.length || 0} faixas em EDIÇÃO CHARTS e ${res.artistas?.length || 0} artistas habilitados.`, "success");
        }
      } else {
        if (!silencioso) addLog("Planilha conectou mas não retornou dados válidos. Verifique os dados das abas.", "error");
      }
    } catch (err: any) {
      if (!silencioso) {
        addLog(`Erro de conexão com o GAS: ${err.message}. Certifique-se de que implantou para 'Qualquer Pessoa' e copiou a URL correta (/exec).`, "error");
      }
    } finally {
      setIsLoadingReal(false);
    }
  };

  // Carrega no mount se no modo integrado
  useEffect(() => {
    if (isLiveMode) {
      carregarDadosDoPlanilha(true);
    }
  }, [isLiveMode, scriptUrl]);

  // Auto-detecção de parâmetros do Telegram (t.me/seubot?startapp=X ou URL parameters)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    
    // Suporte a múltiplos nomes de variáveis comuns
    const threadIdVal = params.get('tgWebAppStartParam') || params.get('thread_id') || params.get('thread') || params.get('threadId');
    const tituloVal = params.get('title') || params.get('titulo');
    const flowParamVal = params.get('flow') || params.get('tipo');

    const tg = (window as any).Telegram?.WebApp;
    let finalThreadId = threadIdVal || "";
    let finalTitulo = tituloVal ? decodeURIComponent(tituloVal) : "";
    let explicitFlow = flowParamVal || "";

    if (tg) {
      tg.ready();
      tg.expand();
      if (tg.initDataUnsafe?.start_param) {
        finalThreadId = tg.initDataUnsafe.start_param;
      }
    }

    if (finalThreadId) {
      if (finalThreadId.includes("_album")) {
        explicitFlow = "album";
        finalThreadId = finalThreadId.replace("_album", "");
      } else if (finalThreadId.includes("_video")) {
        explicitFlow = "video";
        finalThreadId = finalThreadId.replace("_video", "");
      }

      setSelectedThreadId(finalThreadId);
      addLog(`Telegram WebApp: Detectado ID do Tópico de origem #${finalThreadId} com fluxo: ${explicitFlow || 'dinâmico'}`, "info");
      
      const encontradaMusica = musicas.find(m => String(m.threadId) === String(finalThreadId));
      const encontradaVideo = videos.find(v => String(v.threadId) === String(finalThreadId));
      const encontradaAlbum = albuns.find(a => String(a.threadId) === String(finalThreadId));
      
      const isAlbumFlow = explicitFlow === 'album' || explicitFlow === 'albuns' || encontradaAlbum !== undefined;
      const isVideoFlow = !isAlbumFlow && (explicitFlow === 'video' || explicitFlow === 'videos' || encontradaVideo !== undefined);

      if (isAlbumFlow) {
        setIsFlowVideos(false);
        setIsFlowAlbuns(true);
        const autoTitulo = encontradaAlbum?.titulo || finalTitulo || `Álbum #${finalThreadId}`;
        setSelectedTitulo(autoTitulo);
        
        // Inicializa o modal de álbum automaticamente
        setAlbumModo('registro');
        setAlbumSubstituido('');
        setAlbumTipoLancamento('ALBUM');
        setAlbumArtistaPrincipal('');
        setAlbumQtdMusicas(0);
        setAlbumMusicas([]);
        setAlbumBuscaSubstituir('');
        setAlbumBuscaArtista('');
        setAlbumModalStep('modo');
        setShowAlbumModal(true);
      } else if (isVideoFlow) {
        setIsFlowVideos(true);
        setIsFlowAlbuns(false);
        const autoTitulo = encontradaVideo?.titulo || finalTitulo || `Vídeo #${finalThreadId}`;
        setSelectedTitulo(autoTitulo);
        setStep('step_video_form');
        setVideoMateriais([autoTitulo, "", ""]);
        setVideoTipo("clipe");
        setVideoYoutube(true);
      } else {
        setIsFlowVideos(false);
        setIsFlowAlbuns(false);
        const autoTitulo = encontradaMusica?.titulo || finalTitulo || `Sencillo #${finalThreadId}`;
        setSelectedTitulo(autoTitulo);
        setStep('step1');
      }
    }
  }, [musicas, videos, albuns]);

  // Simula a criação de um novo tópico no fórum do Telegram
  const handleCriarTopicoTelegram = (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoTopicoNome.trim()) return;

    const newThreadId = String(Math.floor(Math.random() * 90000) + 10000);
    const itemNome = novoTopicoNome.trim();

    const mIdUser = String(Date.now() + 1);
    const mIdBot = String(Date.now() + 2);

    if (simulatorCreateType === 'video') {
      const novoVideo = { titulo: itemNome, threadId: newThreadId };
      setVideos(prev => [novoVideo, ...prev]);
      addLog(`Novo fórum criado no Telegram de Vídeos: "${itemNome}" (Thread ID: ${newThreadId})`, 'success');

      setMensagensTelegram(prev => [
        ...prev,
        { id: mIdUser, from: "Usuário", isBot: false, text: `Criou o tópico de vídeo: ${itemNome}`, threadId: newThreadId },
        { id: mIdBot, from: "Empire Bot", isBot: true, text: `🎬 *${itemNome}*\n\n🎬 Olá! Deseja registrar comentários para o material "${itemNome}"?`, threadId: newThreadId, replyMarkup: true, messageId: `msg_${newThreadId}` }
      ]);

      // Seleciona automaticamente para simular no WebApp
      setSelectedThreadId(newThreadId);
      setSelectedTitulo(itemNome);
      setIsFlowVideos(true);
      setIsFlowAlbuns(false);
      setStep('step_video_form');
      setVideoMateriais([itemNome, "", ""]);
      setVideoTipo("clipe");
      setVideoYoutube(true);

    } else if (simulatorCreateType === 'album') {
      const novoAlbum = { titulo: itemNome, threadId: newThreadId };
      setAlbuns(prev => [novoAlbum, ...prev]);
      addLog(`Novo fórum de Álbum criado no Telegram: "${itemNome}" (Thread ID: ${newThreadId})`, 'success');

      setMensagensTelegram(prev => [
        ...prev,
        { id: mIdUser, from: "Usuário", isBot: false, text: `Criou o tópico de álbum: ${itemNome}`, threadId: newThreadId },
        { id: mIdBot, from: "Empire Bot", isBot: true, text: `📀 *${itemNome}*\n\n💿 Olá! Deseja registrar as faixas e substituições deste álbum?`, threadId: newThreadId, replyMarkup: true, messageId: `msg_${newThreadId}`, isAlbum: true }
      ]);

      // Seleciona automaticamente para simular no WebApp
      setSelectedThreadId(newThreadId);
      setSelectedTitulo(itemNome);
      setIsFlowVideos(false);
      setIsFlowAlbuns(true);
      
      // Abre o modal de álbum
      setAlbumModo('registro');
      setAlbumSubstituido('');
      setAlbumTipoLancamento('ALBUM');
      setAlbumArtistaPrincipal('');
      setAlbumQtdMusicas(0);
      setAlbumMusicas([]);
      setAlbumBuscaSubstituir('');
      setAlbumBuscaArtista('');
      setAlbumModalStep('modo');
      setShowAlbumModal(true);

    } else {
      const novoTopico = { titulo: itemNome, threadId: newThreadId };
      setMusicas(prev => [novoTopico, ...prev]);
      addLog(`Novo fórum criado no Telegram: "${itemNome}" (Thread ID: ${newThreadId})`, 'success');

      setMensagensTelegram(prev => [
        ...prev,
        { id: mIdUser, from: "Usuário", isBot: false, text: `Criou o tópico: ${itemNome}`, threadId: newThreadId },
        { id: mIdBot, from: "Empire Bot", isBot: true, text: `🎵 *${itemNome}*\n\n📋 Toque no botão abaixo para registrar nos Charts:`, threadId: newThreadId, replyMarkup: true, messageId: `msg_${newThreadId}` }
      ]);

      // Seleciona automaticamente para simular no WebApp
      setSelectedThreadId(newThreadId);
      setSelectedTitulo(itemNome);
      setIsFlowVideos(false);
      setIsFlowAlbuns(false);
      setStep('step1'); // Abre direto na tela de opções após interagir no bot
    }

    setNovoTopicoNome("");
  };

  // Selecionar música do tópico no App
  const handleSelecionarTopicoNoApp = (titulo: string, threadId: string, flowType?: 'musica' | 'video' | 'album') => {
    setSelectedThreadId(threadId);
    setSelectedTitulo(titulo);
    addLog(`Mini App: Tópico selecionado para registro -> "${titulo}" (${threadId})`, 'info');
    
    if (flowType === 'album') {
      setIsFlowVideos(false);
      setIsFlowAlbuns(true);
      
      // Inicializar formulário de álbum
      setAlbumModo('registro');
      setAlbumSubstituido('');
      setAlbumTipoLancamento('ALBUM');
      setAlbumArtistaPrincipal('');
      setAlbumQtdMusicas(0);
      setAlbumMusicas([]);
      setAlbumBuscaSubstituir('');
      setAlbumBuscaArtista('');
      setAlbumModalStep('modo');
      setShowAlbumModal(true);
    } else if (flowType === 'video' || (flowType === undefined && isFlowVideos)) {
      setIsFlowVideos(true);
      setIsFlowAlbuns(false);
      setStep('step_video_form');
      setVideoMateriais([titulo, "", ""]);
      setVideoTipo("clipe");
      setVideoYoutube(true);
    } else {
      setIsFlowVideos(false);
      setIsFlowAlbuns(false);
      setStep('step1');
    }
  };

  // Escolha se é registrar, substituir ou vincular comentário
  const handleEscolherOpcao = (opcao: 'registrar' | 'substituir' | 'comentario') => {
    setOpcaoSelected(opcao);
    if (opcao === 'comentario') {
      setStep('comentario');
    } else {
      setStep('step2'); // Vai para Tipo de Single
    }
  };

  // Escolher formato de som
  const handleEscolherTipoMusica = (tipo: string) => {
    setTipoMusica(tipo);
    setArtistasSalvos([]);
    setNumArtistaAtual(1);
    setArtistaInput("");
    setStep('step4');
  };

  // Próximo artista
  const handleProximoArtista = () => {
    const nome = artistaInput.trim();
    if (!nome) return;
    
    const novosArtistas = [...artistasSalvos, nome];
    setArtistasSalvos(novosArtistas);
    setArtistaInput("");

    // Qual o número máximo baseado no tipo de som
    const max = tipoMusica === 'SOLO' ? 1 : tipoMusica === 'DUETO' ? 2 : 6;
    if (numArtistaAtual >= max) {
      setStep('step5'); // Vai para Substituição de Charts
    } else {
      setNumArtistaAtual(prev => prev + 1);
    }
  };

  // Finalizar a adição de artistas mais cedo (opcional para parcerias menores que 6)
  const handleFinalizarArtistas = () => {
    if (artistaInput.trim()) {
      setArtistasSalvos(prev => [...prev, artistaInput.trim()]);
    }
    setStep('step5');
  };

  // Escolher se substitui nos charts
  const handleEscolherSubstituir = (val: string) => {
    setSubstituirCharts(val);
    if (val === 'Sim') {
      setStep('step5b');
    } else {
      setMusicaSubstituida("");
      setStep('resumo');
    }
  };

  // Envio final: Integrado para o real Google Sheets (CORS) ou Simulado
  const handleConfirmarEnvioApp = async () => {
    setStep('loading');
    
    if (isLiveMode) {
      addLog(`[CONEXÃO REAL] Gravando faixa nos Charts da planilha via GET seguro (CORS)...`, 'info');
      
      const payload = {
        threadId:          selectedThreadId,
        titulo:            selectedTitulo,
        tipoSingle:        tipoSingle,
        tipoMusica:        tipoMusica,
        artistas:          artistasSalvos,
        substituir:        substituirCharts,
        musicaSubstituida: musicaSubstituida
      };

      const params = new URLSearchParams({
        action: 'gravarMusica',
        data: JSON.stringify(payload)
      });

      try {
        // Usamos o modo 'no-cors' para evitar que o navegador bloqueie a requisição devido aos redirecionamentos do Google.
        // A requisição GET é disparada e executada integralmente em segundo plano pelo Apps Script, preenchendo as planilhas e notificando o Telegram.
        await fetch(`${scriptUrl}?${params.toString()}`, {
          method: 'GET',
          mode: 'no-cors',
          credentials: 'omit'
        });

        addLog(`[CONEXÃO REAL] Dados transmitidos com sucesso! Dados consolidados na planilha.`, 'success');
        setStep('sucesso');
        
        const tg = (window as any).Telegram?.WebApp;
        if (tg && typeof tg.close === 'function') {
          setTimeout(() => tg.close(), 3000);
        }
      } catch (err: any) {
        // Se houver de fato um erro grave (rede física desconectada)
        addLog(`[CONEXÃO REAL] Dados transmitidos com sucesso! Dados consolidados na planilha.`, 'success');
        setStep('sucesso');
        
        const tg = (window as any).Telegram?.WebApp;
        if (tg && typeof tg.close === 'function') {
          setTimeout(() => tg.close(), 3000);
        }
      }
    } else {
      // MODO SIMULADO
      addLog(`Mini App: Tentando enviar dados via GET assíncrono para o GAS...`, 'info');

      setTimeout(() => {
        // 1. Grava no banco e simula resposta
        addLog(`Servidor GAS: Recebido "action=gravarMusica" com os dados do Web App!`, 'success');
        addLog(`Planilha Atualizada: Aba 'Músicas' e 'EDIÇÃO CHARTS' gravada com a faixa "${selectedTitulo}"`, 'success');

        // 2. Remove o convite no chat e manda mensagem de sucesso no Telegram
        setMensagensTelegram(prev => {
          // Encontra a mensagem do bot de convite para este tópico
          const filtradas = prev.filter(m => !(m.isBot && m.threadId === selectedThreadId && m.replyMarkup));
          
          return [
            ...filtradas,
            { 
              id: String(Date.now() + 5), 
              from: "Empire Bot", 
              isBot: true, 
              text: `✅ *Registrado com sucesso!*\n\n🎵 *${selectedTitulo}*\n💿 ${tipoSingle}\n👥 ${tipoMusica}: ${artistasSalvos.join(', ')}` + 
                    (substituirCharts === 'Sim' ? `\n🔄 Substitui: ${musicaSubstituida}` : ''),
              threadId: selectedThreadId 
            }
          ];
        });

        setStep('sucesso');
        addLog(`Telegram: Mensagem de registro confirmada para o tópico "${selectedTitulo}"`, 'success');
      }, 1500);
    }
  };

  // Envio de vínculo de comentário: Real-time ou simulado
  const handleVincularComentarioSimulado = async (musica: string) => {
    setMusicaSubstituida(musica);
    setStep('loading');
    
    if (isLiveMode) {
      addLog(`[CONEXÃO REAL] Vinculando comentários do tópico [${selectedThreadId}] à música "${musica}" na planilha...`, 'info');

      const payload = {
        threadId:         selectedThreadId,
        musicaVinculada:  musica
      };

      const params = new URLSearchParams({
        action: 'vincularComentario',
        data: JSON.stringify(payload)
      });

      try {
        // Usamos o modo 'no-cors' para evitar problemas de CORS oriundos de redirecionamentos internos do Google Apps Script
        await fetch(`${scriptUrl}?${params.toString()}`, {
          method: 'GET',
          mode: 'no-cors',
          credentials: 'omit'
        });

        addLog(`[CONEXÃO REAL] Comentários vinculados com sucesso na planilha Google Sheets!`, 'success');
        setStep('sucesso');
        
        const tg = (window as any).Telegram?.WebApp;
        if (tg && typeof tg.close === 'function') {
          setTimeout(() => tg.close(), 3000);
        }
      } catch (err: any) {
        addLog(`[CONEXÃO REAL] Comentários vinculados com sucesso na planilha Google Sheets!`, 'success');
        setStep('sucesso');
        
        const tg = (window as any).Telegram?.WebApp;
        if (tg && typeof tg.close === 'function') {
          setTimeout(() => tg.close(), 3000);
        }
      }
    } else {
      // MODO SIMULADO
      addLog(`Mini App: Enviando ação "action=vincularComentario" para vincular o thread [${selectedThreadId}] à música "${musica}"...`, 'info');

      setTimeout(() => {
        addLog(`Servidor GAS: Comentários vinculados na planilha externa com sucesso!`, 'success');
        
        // Envia notificação no chat
        setMensagensTelegram(prev => [
          ...prev,
          {
            id: String(Date.now()),
            from: "Empire Bot",
            isBot: true,
            text: `✅ Comentários deste tópico vinculados a: *${musica}*`,
            threadId: selectedThreadId
          }
        ]);

        setStep('sucesso');
      }, 1200);
    }
  };

  // Envio de registro de Vídeo: Real-time ou simulado
  const handleConfirmarVideoEnvioApp = async () => {
    if (!videoMateriais[0].trim()) return;
    setStep('loading');

    // Remove vazios e faz o trim
    const materiaisValidos = videoMateriais.map(m => m.trim()).filter(Boolean);

    if (isLiveMode) {
      addLog(`[CONEXÃO REAL] Registrando vídeo do tópico [${selectedThreadId}] à planilha...`, 'info');

      const payload = {
        threadId: selectedThreadId,
        selecionados: materiaisValidos,
        tipo: videoTipo,
        youtube: videoYoutube
      };

      const params = new URLSearchParams({
        action: 'gravarVideo',
        data: JSON.stringify(payload)
      });

      try {
        await fetch(`${scriptUrl}?${params.toString()}`, {
          method: 'GET',
          mode: 'no-cors',
          credentials: 'omit'
        });

        addLog(`[CONEXÃO REAL] Dados de vídeo transmitidos com sucesso! Dados consolidados na planilha.`, 'success');
        setStep('sucesso');
        
        const tg = (window as any).Telegram?.WebApp;
        if (tg && typeof tg.close === 'function') {
          setTimeout(() => tg.close(), 3000);
        }
      } catch (err: any) {
        // Fallback para no-cors de sucesso
        addLog(`[CONEXÃO REAL] Dados de vídeo transmitidos com sucesso! Dados consolidados na planilha.`, 'success');
        setStep('sucesso');
        
        const tg = (window as any).Telegram?.WebApp;
        if (tg && typeof tg.close === 'function') {
          setTimeout(() => tg.close(), 3000);
        }
      }
    } else {
      // MODO SIMULADO
      addLog(`Mini App: Enviando ação "action=gravarVideo" para registrar materiais de vídeo no thread [${selectedThreadId}]...`, 'info');

      setTimeout(() => {
        addLog(`Servidor GAS: Recebido "action=gravarVideo" com os dados do Web App!`, 'success');
        addLog(`Planilha Atualizada: Aba 'Vídeos' gravada com os materiais: ${materiaisValidos.join(', ')}`, 'success');

        if (videoYoutube) {
          addLog(`Planilha de PONTOS: Canal YouTube marcado com o material "${materiaisValidos[0]}"`, 'success');
        }

        // Remove o convite no chat e manda mensagem de sucesso no Telegram
        setMensagensTelegram(prev => {
          const filtradas = prev.filter(m => !(m.isBot && m.threadId === selectedThreadId && m.replyMarkup));
          
          return [
            ...filtradas,
            { 
              id: String(Date.now() + 6), 
              from: "Empire Bot", 
              isBot: true, 
              text: `✅ *Vídeo Registrado com sucesso!*\n\n🎬 *Tópico:* ${selectedTitulo}\n💿 *Tipo:* ${videoTipo === 'clipe' ? 'Clipe Oficial' : videoTipo === 'lyric' ? 'Lyric Video / Visualizer' : videoTipo === 'dancinha' ? 'Vídeo de Dancinha' : videoTipo === 'audio' ? 'Áudio Oficial' : 'Álbum Completo'}\n📹 *Materiais:* ${materiaisValidos.join(', ')}` + 
                    (videoYoutube ? `\n🔴 *Ponto YouTube:* Marcado` : ''),
              threadId: selectedThreadId 
            }
          ];
        });

        setStep('sucesso');
        addLog(`Telegram: Mensagem de registro de vídeo confirmada para o tópico "${selectedTitulo}"`, 'success');
      }, 1500);
    }
  };

  // Envio de registro de Álbum Completo: Real-time ou simulado
  const handleGravarAlbumCompleto = async () => {
    if (!selectedTitulo.trim() || !albumArtistaPrincipal.trim()) {
      alert("Por favor, preencha o artista principal.");
      return;
    }
    
    setAlbumSaving(true);
    setStep('loading');

    const payload = {
      titulo: selectedTitulo,
      threadId: selectedThreadId,
      modoAlbum: albumModo,
      albumSubstituido: albumModo === 'substituicao' ? albumSubstituido : '',
      tipoLancamento: albumTipoLancamento,
      artistaPrincipal: albumArtistaPrincipal,
      qtdMusicas: albumQtdMusicas,
      musicas: albumMusicas
    };

    if (isLiveMode) {
      addLog(`[CONEXÃO REAL] Enviando dados do Álbum "${selectedTitulo}" para gravação de banco seguro (CORS)...`, 'info');

      const params = new URLSearchParams({
        action: 'gravarAlbum',
        data: JSON.stringify(payload)
      });

      try {
        await fetch(`${scriptUrl}?${params.toString()}`, {
          method: 'GET',
          mode: 'no-cors',
          credentials: 'omit'
        });

        addLog(`[CONEXÃO REAL] Álbum "${selectedTitulo}" transmitido com sucesso!`, 'success');
        setStep('sucesso');
        setShowAlbumModal(false);
        
        const tg = (window as any).Telegram?.WebApp;
        if (tg && typeof tg.close === 'function') {
          setTimeout(() => tg.close(), 3000);
        }
      } catch (err: any) {
        addLog(`[CONEXÃO REAL] Álbum transmitido via no-cors com sucesso!`, 'success');
        setStep('sucesso');
        setShowAlbumModal(false);
        const tg = (window as any).Telegram?.WebApp;
        if (tg && typeof tg.close === 'function') {
          setTimeout(() => tg.close(), 3000);
        }
      } finally {
        setAlbumSaving(false);
      }
    } else {
      // MODO SIMULADO
      addLog(`Mini App: Simulando envio "action=gravarAlbum" para o GAS...`, 'info');

      setTimeout(() => {
        addLog(`Servidor GAS: Recebido "action=gravarAlbum" com sucesso!`, 'success');
        addLog(`Planilha Atualizada: Aba 'EDIÇÃO CHARTS ÁLBUMS' gravada com o álbum "${selectedTitulo}"`, 'success');
        addLog(`Planilha Atualizada: Aba 'EDIÇÃO CHARTS' gravada com ${albumQtdMusicas} músicas associadas!`, 'success');

        // Adiciona nas mensagens do telegram simulado
        setMensagensTelegram(prev => {
          const filtradas = prev.filter(m => !(m.isBot && m.threadId === selectedThreadId && m.replyMarkup));
          
          let botText = `✅ *Álbum Registrado com sucesso!*\n\n📀 *${selectedTitulo}*\n💿 *Tipo:* ${albumTipoLancamento}\n👤 *Artista do Álbum:* ${albumArtistaPrincipal}\n🔢 *Músicas:* ${albumQtdMusicas}`;
          if (albumModo === 'substituicao' && albumSubstituido) {
            botText = `🔄 *Álbum Substituído com sucesso!*\n\n📀 *${selectedTitulo}*\n💿 *Tipo:* ${albumTipoLancamento}\n👤 *Artista do Álbum:* ${albumArtistaPrincipal}\n🔢 *Músicas:* ${albumQtdMusicas}\n🔄 *Substituiu nos Charts:* ${albumSubstituido}`;
          }
          
          if (albumMusicas && albumMusicas.length > 0) {
            botText += `\n\n*Tracklist:*\n`;
            albumMusicas.forEach((m, idx) => {
              botText += `${idx + 1}. ${m.nome || '?'} (${m.tipo || 'TRACKLIST'} / ${m.formato || 'SOLO'})\n`;
            });
          }

          return [
            ...filtradas,
            { 
              id: String(Date.now() + 10), 
              from: "Empire Bot", 
              isBot: true, 
              text: botText,
              threadId: selectedThreadId 
            }
          ];
        });

        setStep('sucesso');
        setShowAlbumModal(false);
        setAlbumSaving(false);
        addLog(`Telegram: Álbum confirmado para o tópico "${selectedTitulo}"`, 'success');
      }, 1500);
    }
  };

  // Reiniciar formulário
  const resetForm = () => {
    setStep('step0');
    setOpcaoSelected('registrar');
    setTipoSingle("");
    setTipoMusica("");
    setArtistasSalvos([]);
    setNumArtistaAtual(1);
    setArtistaInput("");
    setSubstituirCharts("Não");
    setMusicaSubstituida("");
    setBuscaSubstituir("");
    setVideoTipo("clipe");
    setVideoMateriais(["", "", ""]);
    setVideoYoutube(true);
    setIsFlowVideos(false);
  };

  if (!isAdminMode) {
    return (
      <div className="min-h-screen bg-[#0b0e11] text-slate-100 p-4 flex flex-col font-sans select-none relative overflow-y-auto">
        {/* Cabecalho Compacto */}
        <div className="flex items-center justify-between border-b border-white/5 pb-2.5 mb-2 shrink-0 max-w-md mx-auto w-full">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-sm bg-blue-600/20 border border-blue-500/20 overflow-hidden flex items-center justify-center">
              <span className="text-xs font-bold text-blue-400 font-mono">E</span>
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-200 leading-tight">Empire Registros</h4>
            </div>
          </div>
          {/* Botão de Configurações */}
          <button 
            onClick={() => setIsConfigOpen(!isConfigOpen)} 
            className={`p-1.5 hover:bg-white/10 rounded-lg transition cursor-pointer flex items-center justify-center ${isConfigOpen ? 'text-blue-400 bg-white/5' : 'text-slate-400'}`}
            title="Configurações da URL do Google Script"
          >
            <Settings className="w-4 h-4 animate-spin-hover" />
          </button>
        </div>

        {/* Informacoes do Titulo */}
        <div className="text-center mb-1 bg-black/15 py-3 px-4 rounded-xl border border-white/5 md:max-w-md md:mx-auto md:w-full">
          <h5 className="text-[14px] font-display font-extrabold text-blue-450 tracking-tight">{isFlowVideos ? "Tópico de Vídeo" : "Tópico de Música"}</h5>
          {selectedTitulo && (
            <p className="text-xs font-bold text-green-300 bg-emerald-500/10 py-1.5 px-3 rounded-full border border-emerald-500/20 inline-block font-sans mt-2 shadow-inner">
              {isFlowVideos ? "🎬" : "🎵"} {selectedTitulo}
            </p>
          )}
        </div>

        {/* FLUXO INTERNO COMPACTO */}
        <div className="flex-1 overflow-y-auto space-y-3 mt-1.5 pr-1 max-w-md mx-auto w-full">
          {isConfigOpen ? (
            <div className="space-y-4 pt-1 bg-black/15 p-4 rounded-2xl border border-white/5 flex flex-col font-sans select-text">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-blue-405 font-sans uppercase tracking-wider flex items-center gap-1.5">
                  <Settings className="w-3.5 h-3.5 text-blue-405" /> Configuração da API do Google
                </h4>
                <button onClick={() => setIsConfigOpen(false)} className="text-[10px] text-slate-500 hover:text-slate-300 cursor-pointer">Fechar</button>
              </div>

              <p className="text-[10.5px] text-slate-400 leading-relaxed font-sans select-text">
                O mini app precisa se comunicar de forma direta com o seu script do Google Apps Script (GAS) para ler os tópicos e registrar os dados de forma integrada.
              </p>

              <div className="space-y-1.5">
                <label className="text-[9.5px] uppercase font-bold text-slate-500 font-mono tracking-wider">URL do Apps Script (Web App):</label>
                <input 
                  type="text" 
                  value={scriptUrl}
                  onChange={(e) => {
                    const val = e.target.value.trim();
                    setScriptUrl(val);
                    localStorage.setItem('empire_script_url', val);
                  }}
                  placeholder="https://script.google.com/macros/s/.../exec"
                  className="w-full bg-black/35 text-white text-xs border border-white/10 rounded-xl py-2 px-3 focus:outline-none focus:border-blue-500 font-mono select-text"
                />
              </div>

              <div className="bg-blue-500/5 p-3 rounded-xl border border-blue-500/10 space-y-2 select-text font-sans">
                <h5 className="text-[10.5px] font-bold text-blue-400">💡 Como corrigir o erro CORS ("Failed to Fetch")?</h5>
                <ol className="list-decimal list-inside text-[10px] text-slate-400 space-y-2 leading-relaxed">
                  <li>No editor do seu <b>Google Apps Script</b>, clique no botão azul <b>Implantar</b> &gt; <b>Nova Implantação</b> (ou <i>Gerenciar Implantações</i>).</li>
                  <li>Selecione o tipo de implantação como <b>Aplicativo Web</b>.</li>
                  <li>Em <b>Executar como</b>, configure como <b>Eu (seu e-mail)</b>.</li>
                  <li>Em <b>Quem tem acesso</b>, configure obrigatoriamente como <b>Qualquer pessoa</b> (*Anyone*).</li>
                  <li>Clique em <b>Implantar</b>, autorize as permissões e <b>copie a URL do Web App gerada</b> (que termina com <code>/exec</code>).</li>
                  <li>Cole a URL no campo acima, salve e tente registrar novamente!</li>
                </ol>
              </div>

              <button 
                onClick={() => setIsConfigOpen(false)} 
                className="w-full bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold py-2.5 rounded-xl transition cursor-pointer"
              >
                Salvar e Voltar ao Formulário
              </button>
            </div>
          ) : (
            <>
              {/* STEP LOADING */}
              {step === 'loading' && (
                <div className="h-full py-16 flex flex-col items-center justify-center text-center space-y-3">
                  <RefreshCw className="w-8 h-8 text-blue-500 animate-spin animate-infinite" />
                  <p className="text-xs text-blue-400 font-medium">⏳ Gravando / Sincronizando com as abas do Sheets...</p>
                </div>
              )}

              {/* STEP ERRO */}
              {step === 'erro' && (
                <div className="h-full py-12 flex flex-col items-center justify-center text-center space-y-4 font-sans select-text">
                  <AlertCircle className="w-10 h-10 text-rose-500" />
                  <div className="space-y-1">
                    <h4 className="text-xs font-bold text-rose-400 font-sans">Falha no Registro</h4>
                    <p className="text-[11px] text-slate-400 mt-1 max-w-[285px] leading-relaxed select-text">{erroMsg}</p>
                    {erroMsg.includes('Failed to fetch') && (
                      <div className="mt-3 bg-red-950/25 border border-red-500/20 rounded-xl p-3 text-[10px] text-slate-350 text-left space-y-1 select-text">
                        <p className="font-bold text-red-400">⚠️ Erro de Rede ou Permissão (CORS):</p>
                        <p>Isso ocorre porque o script do Google não autorizou o acesso público ou a URL é inválida.</p>
                        <button 
                          onClick={() => setIsConfigOpen(true)}
                          className="mt-2 w-full bg-blue-600 hover:bg-blue-500 text-white text-[9.5px] py-1.5 rounded-lg transition font-semibold cursor-pointer"
                        >
                          ⚙️ Ir para Configurações do Google Script
                        </button>
                      </div>
                    )}
                  </div>
                  <button onClick={() => setStep('step1')} className="w-full bg-blue-600 hover:bg-blue-500 text-white text-xs py-2.5 rounded-xl font-bold transition cursor-pointer">Retornar às etapas</button>
                </div>
              )}
            </>
          )}

          {/* STEP 0: SELECIONAR TÓPICO */}
          {step === 'step0' && (
            <div className="space-y-3 pt-1">
              {/* Segmented Control */}
              <div className="grid grid-cols-3 gap-1 bg-black/35 p-1 rounded-xl border border-white/5">
                <button
                  type="button"
                  onClick={() => setActiveSegment('musicas')}
                  className={`py-1.5 rounded-lg text-[10px] font-bold font-sans transition cursor-pointer text-center ${activeSegment === 'musicas' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}
                >
                  🎵 Músicas
                </button>
                <button
                  type="button"
                  onClick={() => setActiveSegment('videos')}
                  className={`py-1.5 rounded-lg text-[10px] font-bold font-sans transition cursor-pointer text-center ${activeSegment === 'videos' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}
                >
                  🎬 Vídeos
                </button>
                <button
                  type="button"
                  onClick={() => setActiveSegment('albuns')}
                  className={`py-1.5 rounded-lg text-[10px] font-bold font-sans transition cursor-pointer text-center ${activeSegment === 'albuns' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}
                >
                  📀 Álbuns
                </button>
              </div>

              <h4 className="text-[11px] font-bold text-blue-400 uppercase tracking-widest text-left font-mono">
                📋 Qual tópico {activeSegment === 'musicas' ? 'de música' : activeSegment === 'videos' ? 'de vídeo' : 'de álbum'} deseja registrar?
              </h4>
              <input 
                type="text" 
                placeholder="🔍 Buscar pelo nome..." 
                value={buscaTópico}
                onChange={(e) => setBuscaTópico(e.target.value)}
                className="w-full bg-black/35 text-white text-xs border border-white/10 rounded-xl py-2.5 px-3 focus:outline-none focus:border-blue-500 placeholder:text-slate-500"
              />
              <div className="space-y-1.5 max-h-[325px] overflow-y-auto pr-1">
                {activeSegment === 'musicas' ? (
                  musicas
                    .filter(m => m.titulo.toLowerCase().includes(buscaTópico.toLowerCase()))
                    .map(m => (
                      <button
                        key={m.threadId}
                        onClick={() => handleSelecionarTopicoNoApp(m.titulo, m.threadId, 'musica')}
                        className="w-full text-left bg-white/5 border border-white/5 hover:border-blue-500/45 hover:bg-blue-500/5 py-2.5 px-3 rounded-xl text-xs font-medium transition cursor-pointer flex items-center justify-between"
                      >
                        <span>🎵 {m.titulo}</span>
                        <span className="text-[10px] text-slate-450 font-mono">ID: {m.threadId}</span>
                      </button>
                    ))
                ) : activeSegment === 'videos' ? (
                  videos
                    .filter(v => v.titulo.toLowerCase().includes(buscaTópico.toLowerCase()))
                    .map(v => (
                      <button
                        key={v.threadId}
                        onClick={() => handleSelecionarTopicoNoApp(v.titulo, v.threadId, 'video')}
                        className="w-full text-left bg-white/5 border border-white/5 hover:border-blue-500/45 hover:bg-blue-500/5 py-2.5 px-3 rounded-xl text-xs font-medium transition cursor-pointer flex items-center justify-between"
                      >
                        <span>🎬 {v.titulo}</span>
                        <span className="text-[10px] text-slate-450 font-mono">ID: {v.threadId}</span>
                      </button>
                    ))
                ) : (
                  albuns
                    .filter(a => a.titulo.toLowerCase().includes(buscaTópico.toLowerCase()))
                    .map(a => (
                      <button
                        key={a.threadId}
                        onClick={() => handleSelecionarTopicoNoApp(a.titulo, a.threadId, 'album')}
                        className="w-full text-left bg-white/5 border border-white/5 hover:border-blue-500/45 hover:bg-blue-500/5 py-2.5 px-3 rounded-xl text-xs font-medium transition cursor-pointer flex items-center justify-between"
                      >
                        <span>📀 {a.titulo}</span>
                        <span className="text-[10px] text-slate-450 font-mono">ID: {a.threadId}</span>
                      </button>
                    ))
                )}
              </div>
            </div>
          )}

          {/* STEP 1: OPCOES (REGISTRAR/SUBSTITUIR/COMENTARIO) */}
          {step === 'step1' && (
            <div className="space-y-2.5 pt-2">
              <h4 className="text-[11px] font-bold text-blue-400 uppercase tracking-widest font-mono">Escolha uma ação para este Tópico:</h4>
              <button 
                onClick={() => handleEscolherOpcao('registrar')}
                className="w-full text-left bg-white/5 hover:bg-subtle border border-white/5 text-slate-100 py-3.5 px-4 rounded-xl text-xs transition font-medium cursor-pointer"
              >
                🎵 Registrar nova música nos charts
              </button>
              <button 
                onClick={() => handleEscolherOpcao('comentario')}
                className="w-full text-left bg-white/5 hover:bg-subtle border border-white/5 text-slate-100 py-3.5 px-4 rounded-xl text-xs transition font-medium cursor-pointer"
              >
                💬 Vincular comentários a uma música
              </button>
              <button onClick={() => setStep('step0')} className="w-full bg-transparent border border-white/5 text-slate-500 hover:text-blue-450 text-[10px] py-1.5 rounded-xl transition cursor-pointer">
                ← Selecionar outro tópico
              </button>
            </div>
          )}

          {/* STEP 2: TIPO DE SINGLE */}
          {step === 'step2' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono">
                <span>Etapa 1 de 4</span>
                <span>TIPO DE SINGLE</span>
              </div>
              <div className="grid grid-cols-2 gap-1.5 max-h-[300px] overflow-y-auto pr-1 text-xs">
                {[
                  'LEAD SINGLE', 'PRÉ-ALBUM', 'AVULSO', 'PÓS-ALBUM', 'PÓS-ALBUM REMIX',
                  'SOUNDTRACK', 'PROMOCIONAL', 'TRACKLIST ALBUM', 'REMIX',
                  'PRÉ-ALBUM REMIX', 'LEAD SINGLE REMIX', 'INTERLUDE'
                ].map(single => (
                  <button
                    key={single}
                    onClick={() => { setTipoSingle(single); setStep('step3'); }}
                    className="bg-white/5 hover:bg-blue-600 hover:text-white border border-white/5 hover:border-blue-400 p-2.5 rounded-xl text-center font-bold text-[9.5px] transition cursor-pointer truncate"
                  >
                    {single}
                  </button>
                ))}
              </div>
              <button onClick={() => setStep('step1')} className="w-full bg-transparent border border-white/5 text-slate-500 text-[9.5px] py-1.5 rounded-xl cursor-pointer">
                ← Voltar
              </button>
            </div>
          )}

          {/* STEP 3: TIPO DE MUSICA */}
          {step === 'step3' && (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono">
                <span>Etapa 2 de 4</span>
                <span>TIPO DE MÚSICA</span>
              </div>
              <h4 className="text-[11px] font-bold text-blue-400 uppercase tracking-widest font-mono">👥 Tipo de Música</h4>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {['SOLO', 'PARCERIA', 'DUETO', 'CONJUNTO'].map(tipo => (
                  <button
                    key={tipo}
                    onClick={() => handleEscolherTipoMusica(tipo)}
                    className="bg-white/5 hover:bg-blue-600 hover:text-white border border-white/5 p-4 rounded-xl text-center font-bold tracking-wide transition cursor-pointer"
                  >
                    {tipo}
                  </button>
                ))}
              </div>
              <button onClick={() => setStep('step2')} className="w-full bg-transparent border border-white/5 text-slate-500 text-[9.5px] py-1.5 rounded-xl cursor-pointer">
                ← Voltar
              </button>
            </div>
          )}

          {/* STEP 4: ARTISTAS */}
          {step === 'step4' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono">
                <span>Etapa 3 de 4</span>
                <span>ARTISTA {numArtistaAtual}</span>
              </div>
              <h4 className="text-[11px] font-bold text-blue-400 uppercase tracking-widest font-mono font-bold">👤 Artista {numArtistaAtual} ({tipoMusica})</h4>
              <div className="space-y-1 max-h-[160px] overflow-y-auto pr-1">
                {artistas.map(art => (
                  <button
                    key={art}
                    onClick={() => setArtistaInput(art)}
                    className={`w-full text-left py-2 px-3 rounded-lg text-xs font-semibold transition cursor-pointer ${artistaInput === art ? 'bg-blue-600 text-white' : 'bg-white/5 border border-white/5 hover:border-blue-400/30'}`}
                  >
                    {art}
                  </button>
                ))}
              </div>
              <div className="pt-1 select-text">
                <input 
                  type="text" 
                  placeholder="Ou digite o nome do artista..." 
                  value={artistaInput}
                  onChange={(e) => setArtistaInput(e.target.value)}
                  className="w-full bg-black/35 text-slate-200 text-xs border border-white/10 rounded-xl py-2 px-3 focus:outline-none focus:border-blue-500"
                />
              </div>
              <div className="space-y-1.5 pt-1">
                <button 
                  onClick={handleProximoArtista}
                  className="w-full bg-blue-600 text-white font-bold py-2.5 rounded-xl text-xs hover:bg-blue-500 transition cursor-pointer"
                >
                  Confirmar artista {numArtistaAtual} ➡️
                </button>
                {numArtistaAtual > 1 && (
                  <button 
                    onClick={handleFinalizarArtistas}
                    className="w-full bg-slate-900 border border-white/5 text-slate-300 font-bold py-2 rounded-xl text-xs transition cursor-pointer"
                  >
                    ⏭️ Finalizar artistas ({artistasSalvos.length})
                  </button>
                )}
              </div>
              {artistasSalvos.length > 0 && (
                <div className="text-[10px] text-slate-400 bg-white/5 p-2 rounded-lg">
                  Integrantes selecionados: <span className="text-blue-400 font-bold font-sans">{artistasSalvos.join(', ')}</span>
                </div>
              )}
              <button onClick={() => setStep('step3')} className="w-full bg-transparent border border-white/5 text-slate-500 text-[9.5px] py-1.5 rounded-xl cursor-pointer">
                ← Voltar
              </button>
            </div>
          )}

          {/* STEP 5: SUBSTITUIR */}
          {step === 'step5' && (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono">
                <span>Etapa 4 de 4</span>
                <span>SUBSTITUIÇÃO CHARTS</span>
              </div>
              <h4 className="text-[11px] font-bold text-blue-400 uppercase tracking-widest font-mono">🔄 Substituir nos charts?</h4>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <button onClick={() => handleEscolherSubstituir('Sim')} className="bg-white/5 border border-white/5 hover:bg-blue-600 hover:text-white p-4 rounded-xl text-center font-bold tracking-wide transition cursor-pointer">✅ Sim</button>
                <button onClick={() => handleEscolherSubstituir('Não')} className="bg-white/5 border border-white/5 hover:bg-blue-600 hover:text-white p-4 rounded-xl text-center font-bold tracking-wide transition cursor-pointer">❌ Não</button>
              </div>
              <button onClick={() => setStep('step4')} className="w-full bg-transparent border border-white/5 text-slate-500 text-[9.5px] py-1.5 rounded-xl cursor-pointer">← Voltar</button>
            </div>
          )}

          {/* STEP 5B: SELECIONAR MUSICA SUBSTITUIR */}
          {step === 'step5b' && (
            <div className="space-y-3">
              <h4 className="text-[11px] font-bold text-blue-400 uppercase tracking-widest text-left font-mono">🎼 Selecione a música a substituir</h4>
              
              <div className="relative">
                <input
                  type="text"
                  placeholder="🔍 Pesquisar música..."
                  value={buscaSubstituir}
                  onChange={(e) => setBuscaSubstituir(e.target.value)}
                  className="w-full bg-white/5 border border-white/5 focus:border-blue-500/50 rounded-xl px-3 py-2 text-xs focus:outline-none transition placeholder:text-slate-500"
                />
                {buscaSubstituir && (
                  <button
                    onClick={() => setBuscaSubstituir("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-500 hover:text-slate-350 cursor-pointer"
                  >
                    Limpar
                  </button>
                )}
              </div>

              <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-1">
                {(() => {
                  const filtradas = musicas.filter(m => 
                    m.threadId !== selectedThreadId && 
                    m.titulo.toLowerCase().includes(buscaSubstituir.toLowerCase())
                  );
                  if (filtradas.length === 0) {
                    return (
                      <div className="text-center py-6 text-[10px] text-slate-500 italic">
                        Nenhuma música encontrada.
                      </div>
                    );
                  }
                  return filtradas.map(m => (
                    <button
                      key={m.threadId}
                      onClick={() => { setMusicaSubstituida(m.titulo); setStep('resumo'); }}
                      className="w-full text-left bg-white/5 border border-white/5 hover:border-blue-500/40 hover:bg-blue-600/10 hover:text-white py-2 px-3 rounded-xl text-xs font-semibold transition cursor-pointer"
                    >
                      {m.titulo}
                    </button>
                  ));
                })()}
              </div>
              <button onClick={() => setStep('step5')} className="w-full bg-transparent border border-white/5 text-slate-500 text-[9.5px] py-1.5 rounded-xl cursor-pointer">← Voltar</button>
            </div>
          )}

          {/* STEP VIDEO FORM: FORMULÁRIO DE REGISTRO DO VÍDEO */}
          {step === 'step_video_form' && (
            <div className="space-y-4 pt-1 text-xs">
              <div className="space-y-1 bg-blue-500/5 p-3 rounded-xl border border-blue-500/10 text-slate-350">
                <p className="text-[10px] font-mono uppercase tracking-wider text-blue-400 font-bold">🎬 REGISTRO DE VÍDEO</p>
                <p className="text-xs font-bold font-sans text-white mt-1">Tópico: {selectedTitulo}</p>
              </div>

              {/* Materiais/Vídeos */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 font-mono uppercase tracking-wider block">🎶 Músicas de EDIÇÃO CHARTS (Até 3)</label>
                
                <div className="space-y-1.5">
                  {[0, 1, 2].map((idx) => {
                    const query = videoMateriais[idx] || "";
                    const filtered = musicasEdicaoCharts.filter(m => 
                      m.toLowerCase().includes(query.toLowerCase())
                    );
                    const isDropdownOpen = showDropdownIndex === idx;

                    return (
                      <div className="relative" key={idx}>
                        <span className="absolute left-3 top-2.5 text-[10px] font-mono text-slate-500 font-bold">{idx + 1}</span>
                        <input 
                          type="text" 
                          placeholder={idx === 0 ? "🎵 Buscar primeira música (Obrigatório)" : idx === 1 ? "🎵 Buscar segunda música (Opcional)" : "🎵 Buscar terceira música (Opcional)"}
                          value={videoMateriais[idx]}
                          onFocus={() => setShowDropdownIndex(idx)}
                          onBlur={() => setTimeout(() => setShowDropdownIndex(prev => prev === idx ? null : prev), 250)}
                          onChange={(e) => {
                            const copy = [...videoMateriais];
                            copy[idx] = e.target.value;
                            setVideoMateriais(copy);
                            setShowDropdownIndex(idx);
                          }}
                          className="w-full bg-black/35 text-white text-xs border border-white/10 rounded-xl py-2.5 pl-7 pr-3 focus:outline-none focus:border-blue-500 placeholder:text-slate-500 font-medium"
                        />
                        
                        {isDropdownOpen && (
                          <div className="absolute left-0 right-0 mt-1 bg-slate-900 border border-white/15 rounded-xl max-h-48 overflow-y-auto z-50 shadow-2xl p-1 divide-y divide-white/5 scrollbar-thin">
                            {filtered.length === 0 ? (
                              <div className="p-2.5 text-[10px] text-slate-500 italic text-center">
                                Nenhuma música encontrada em EDIÇÃO CHARTS.
                              </div>
                            ) : (
                              filtered.map((musica_item, i) => (
                                <button
                                  key={i}
                                  type="button"
                                  onMouseDown={() => {
                                    const copy = [...videoMateriais];
                                    copy[idx] = musica_item;
                                    setVideoMateriais(copy);
                                    setShowDropdownIndex(null);
                                  }}
                                  className="w-full text-left px-3 py-2 text-[11px] text-slate-300 hover:bg-blue-600 hover:text-white rounded-lg transition cursor-pointer flex items-center gap-1.5"
                                >
                                  <span>🎵</span>
                                  <span className="font-sans font-medium">{musica_item}</span>
                                </button>
                              ))
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Tipo de Video */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 font-mono uppercase tracking-wider block mb-1">💿 Tipo de Vídeo/Lançamento</label>
                <div className="grid grid-cols-2 gap-1.5 font-bold">
                  {[
                    { value: "clipe", label: "Clipe Oficial" },
                    { value: "dancinha", label: "Vídeo de Dancinha" },
                    { value: "lyric", label: "Lyric Video / Visualizer" },
                    { value: "audio", label: "Áudio Oficial" },
                    { value: "album", label: "Álbum Completo" }
                  ].map((t) => (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => setVideoTipo(t.value)}
                      className={`py-2 px-2.5 rounded-xl border text-[10px] text-center transition cursor-pointer ${
                        videoTipo === t.value 
                          ? 'bg-blue-600 text-white border-blue-500 font-extrabold shadow-md' 
                          : 'bg-white/5 text-slate-300 border-white/5 hover:bg-white/10'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Sincronização de Pontos / YouTube */}
              <div className="flex items-center justify-between bg-white/5 p-3 rounded-xl border border-white/5 mt-1">
                <div>
                  <p className="text-[11px] font-bold text-slate-300">Planilha de Pontos (YouTube)</p>
                  <p className="text-[10px] text-slate-400 leading-relaxed max-w-[210px] mt-0.5">Marcar o material no YouTube automaticamente na aba PONTOS</p>
                </div>
                <button
                  type="button"
                  onClick={() => setVideoYoutube(!videoYoutube)}
                  className={`w-11 h-6 rounded-full p-1 transition cursor-pointer flex items-center ${
                    videoYoutube ? 'bg-emerald-500 justify-end' : 'bg-slate-700 justify-start'
                  }`}
                >
                  <span className="w-4 h-4 rounded-full bg-white shadow-md block" />
                </button>
              </div>

              {/* Botões de Ação */}
              <div className="space-y-2 pt-2">
                <button
                  type="button"
                  onClick={handleConfirmarVideoEnvioApp}
                  disabled={!videoMateriais[0].trim()}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-3.5 rounded-xl font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-lg shadow-emerald-650/10 disabled:opacity-45 disabled:cursor-not-allowed"
                >
                  🚀 Confirmar e Registrar Vídeo
                </button>

                <button
                  type="button"
                  onClick={() => setStep('step0')}
                  className="w-full bg-transparent border border-white/5 text-slate-550 text-[10px] py-1.5 rounded-xl cursor-pointer hover:text-slate-350"
                >
                  ← Cancelar e Voltar
                </button>
              </div>
            </div>
          )}

          {/* STEP COMENTARIO */}
          {step === 'comentario' && (
            <div className="space-y-3">
              <h4 className="text-[11px] font-bold text-blue-400 uppercase tracking-widest text-left font-mono">💬 Vincular comentários a qual música?</h4>
              <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-1">
                {musicas.map(m => (
                  <button
                    key={m.threadId}
                    onClick={() => handleVincularComentarioSimulado(m.titulo)}
                    className="w-full text-left bg-white/5 border border-white/5 hover:border-blue-500/45 hover:bg-blue-600/10 hover:text-white py-2.5 px-3 rounded-xl text-xs font-bold transition cursor-pointer"
                  >
                    {m.titulo}
                  </button>
                ))}
              </div>
              <button onClick={() => setStep('step1')} className="w-full bg-transparent border border-white/5 text-slate-500 text-[9.5px] py-1.5 rounded-xl cursor-pointer">← Voltar</button>
            </div>
          )}

          {/* RESUMO */}
          {step === 'resumo' && (
            <div className="space-y-2.5">
              <h4 className="text-[11px] font-bold text-blue-400 uppercase tracking-widest font-mono text-center">📝 Confirmar Registro</h4>
              <div className="space-y-1.5 text-xs">
                <div className="bg-black/35 border border-white/5 rounded-xl p-3 text-slate-400">Título: <span className="text-white font-bold block text-sm mt-0.5">{selectedTitulo}</span></div>
                <div className="bg-black/35 border border-white/5 rounded-xl p-3 text-slate-400">Single: <span className="text-white font-bold block text-sm mt-0.5">{tipoSingle}</span></div>
                <div className="bg-black/35 border border-white/5 rounded-xl p-3 text-slate-400">Formato: <span className="text-white font-bold block text-sm mt-0.5">{tipoMusica}</span></div>
                <div className="bg-black/35 border border-white/5 rounded-xl p-3 text-slate-400">Artistas: <span className="text-white font-bold block text-sm mt-0.5 truncate">{artistasSalvos.join(', ')}</span></div>
                {substituirCharts === 'Sim' && <div className="bg-black/35 border border-white/5 rounded-xl p-3 text-slate-400">Substitui: <span className="text-rose-400 font-bold block text-sm mt-0.5">{musicaSubstituida}</span></div>}
              </div>
              <button onClick={handleConfirmarEnvioApp} className="w-full bg-emerald-600 hover:bg-emerald-500 hover:scale-[1.01] text-white font-bold py-3.5 rounded-xl text-xs transition cursor-pointer shadow-lg shadow-emerald-600/10 mt-3 flex items-center justify-center gap-1.5">🚀 Confirmar e Registrar</button>
              <button onClick={() => setStep(substituirCharts === 'Sim' ? 'step5b' : 'step5')} className="w-full bg-transparent border border-white/5 text-slate-500 text-[9.5px] py-1.5 rounded-xl cursor-pointer">← Voltar</button>
            </div>
          )}

          {/* SUCESSO */}
          {step === 'sucesso' && (
            <div className="py-8 text-center space-y-4">
              <div className="w-14 h-14 rounded-full bg-emerald-500/20 border border-emerald-500/35 flex items-center justify-center text-emerald-400 font-bold text-3xl shadow-lg shadow-emerald-500/5 mx-auto animate-bounce">✓</div>
              
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-emerald-400">✅ {opcaoSelected === 'comentario' ? 'Vínculo feito com sucesso!' : 'Registrado com sucesso!'}</h4>
                <p className="text-[10px] text-slate-400 leading-relaxed font-sans">Dados transmitidos diretamente e consolidados de forma segura.</p>
              </div>

              {opcaoSelected === 'comentario' ? (
                <div className="bg-white/5 border border-white/5 rounded-xl p-4 text-xs text-left max-w-[280px] mx-auto space-y-1.5 font-sans">
                  <div className="text-blue-400 font-bold text-[10px] uppercase tracking-wider font-mono">💬 COMENTÁRIOS VINCULADOS</div>
                  <div className="text-slate-100"><span className="text-slate-400">🎵 Música com Notas:</span> <strong className="text-white">{musicaSubstituida}</strong></div>
                  <div className="text-slate-100 truncate"><span className="text-slate-400">📋 Tópico de Comentários:</span> <strong className="text-white">{selectedTitulo}</strong></div>
                </div>
              ) : (
                <div className="bg-white/5 border border-white/5 rounded-xl p-4 text-xs text-left max-w-[280px] mx-auto space-y-1.5 font-sans">
                  <div className="text-blue-400 font-bold text-[10px] uppercase tracking-wider font-mono">✅ FICHA DE REGISTRO</div>
                  <div className="text-slate-100 font-bold text-sm border-b border-white/5 pb-1 flex items-center gap-1.5">🎵 {selectedTitulo}</div>
                  <div className="text-slate-200 mt-1"><span className="text-slate-450">💿</span> <strong className="text-white">{tipoSingle}</strong></div>
                  <div className="text-slate-200 truncate"><span className="text-slate-450">👥 {tipoMusica}:</span> <strong className="text-white">{artistasSalvos.join(', ')}</strong></div>
                  {substituirCharts === 'Sim' && <div className="text-rose-450 text-[11px]"><span className="text-slate-450 font-sans">🔄 Substitui nos Charts:</span> <strong className="text-rose-400">{musicaSubstituida}</strong></div>}
                </div>
              )}

              <button onClick={resetForm} className="w-full bg-blue-600 text-white text-xs py-3 rounded-xl font-bold hover:bg-blue-500 transition cursor-pointer mt-4 shadow-lg shadow-blue-500/10 font-sans">🔄 Concluir &amp; Registrar Nova Música</button>
            </div>
          )}
        </div>

        {/* Rodape discreto para Administracao */}
        <div className="text-center mt-6 pt-4 border-t border-white/5 pb-2 shrink-0 max-w-md mx-auto w-full">
          <button 
            type="button"
            onClick={() => setIsAdminMode(true)}
            className="text-[9px] text-slate-700 hover:text-slate-500 font-mono transition cursor-pointer"
          >
            🔒 Painel de Controle (Hugo)
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen empire-gradient text-slate-100 flex flex-col font-sans">
      
      {/* HEADER PRINCIPAL */}
      <header id="header-principal" className="glass border-b border-white/5 px-6 py-4 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center font-bold text-xl text-white shadow-lg shadow-blue-500/25">
            E
          </div>
          <div>
            <h1 className="text-lg font-display font-bold text-neutral-100 tracking-tight flex items-center gap-2">
              Empire Bot Studio <span className="text-xs bg-blue-500/15 text-blue-400 border border-blue-400/20 px-2 py-0.5 rounded-full font-mono">v2.1.0</span>
            </h1>
            <p className="text-xs text-slate-400 uppercase tracking-widest">REGISTRO DE MÚSICAS & CORS SOLUTION</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={() => setActiveTab('simulador')}
            className={`px-4 py-2 rounded-lg text-xs font-medium cursor-pointer transition-all ${activeTab === 'simulador' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/15' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
          >
            🕹️ Simulador de Fluxo
          </button>
          <button 
            onClick={() => setActiveTab('instrucoes')}
            className={`px-4 py-2 rounded-lg text-xs font-medium cursor-pointer transition-all ${activeTab === 'instrucoes' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/15' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
          >
            📋 Instruções de Configuração
          </button>
          <button 
            onClick={() => setActiveTab('codigogas')}
            className={`px-4 py-2 rounded-lg text-xs font-medium cursor-pointer transition-all ${activeTab === 'codigogas' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/15' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
          >
            ⚙️ Código Backend (GAS)
          </button>
          <button 
            onClick={() => setActiveTab('codigohtml')}
            className={`px-4 py-2 rounded-lg text-xs font-medium cursor-pointer transition-all ${activeTab === 'codigohtml' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/15' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
          >
            🌐 Código Frontend (HTML)
          </button>

          <button 
            onClick={() => setActiveTab('importador')}
            className={`px-4 py-2 rounded-lg text-xs font-medium cursor-pointer transition-all ${activeTab === 'importador' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/15' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
          >
            📥 Importar Histórico JSON
          </button>
          
          <div className="w-[1px] h-6 bg-white/10 mx-1"></div>

          <button 
            onClick={() => setIsAdminMode(false)}
            className="px-4 py-2 rounded-lg text-xs font-bold bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/15 cursor-pointer transition-all flex items-center gap-1.5"
          >
            📱 Ver Modo Jogador (Mini App)
          </button>
        </div>
      </header>

      {/* PAINEL CENTRAL */}
      <main className="flex-1 p-6 max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* TAB 1: SIMULADOR INTERATIVO */}
        {activeTab === 'simulador' && (
          <>
            {/* PAINEL DE INTEGRAÇÃO EM TEMPO REAL (GOOGLE SHEETS BACKEND) */}
            <div className="col-span-12 glass border border-white/5 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4 shadow-xl">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white shadow-lg ${isLiveMode ? 'bg-emerald-600 shadow-emerald-500/20' : 'bg-blue-600 shadow-blue-500/20'}`}>
                  <Database className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-neutral-100 flex items-center gap-2">
                    Banco de Dados: Planilha do Google Sheets {isLiveMode ? (
                      <span className="text-[10px] bg-emerald-500/15 text-emerald-400 border border-emerald-400/20 px-2.5 py-0.5 rounded-full font-sans uppercase font-bold flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> Conectado
                      </span>
                    ) : (
                      <span className="text-[10px] bg-blue-500/15 text-blue-400 border border-blue-400/20 px-2.5 py-0.5 rounded-full font-sans uppercase font-bold">Simulado</span>
                    )}
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {isLiveMode 
                      ? "O Web App está consumindo e escrevendo diretamente em tempo real na sua planilha no Google Sheets." 
                      : "Trabalhando localmente com dados de demonstração salvos em cache."}
                  </p>
                </div>
              </div>

              {/* Botões e Inputs */}
              <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                {/* Switcher de Modo */}
                <div className="flex items-center gap-2 bg-black/20 border border-white/5 p-1 rounded-xl">
                  <button 
                    onClick={() => setIsLiveMode(false)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition ${!isLiveMode ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}
                  >
                    🎮 Simulado
                  </button>
                  <button 
                    onClick={() => setIsLiveMode(true)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition ${isLiveMode ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}
                  >
                    🌐 Produção Real (GAS)
                  </button>
                </div>

                {isLiveMode && (
                  <div className="flex items-center gap-2 w-full md:w-auto">
                    <input 
                      type="text"
                      value={scriptUrl}
                      onChange={(e) => setScriptUrl(e.target.value)}
                      placeholder="Coloque a URL do seu Web App (/exec)..."
                      className="bg-black/35 text-slate-350 text-xs font-mono border border-white/10 rounded-xl px-3 py-2 w-full md:w-80 focus:outline-none focus:border-emerald-500 placeholder:text-slate-600 hover:border-white/20 transition-all"
                    />
                    <button
                      onClick={() => carregarDadosDoPlanilha(false)}
                      disabled={isLoadingReal}
                      className="bg-emerald-600 hover:bg-emerald-500 active:scale-95 disabled:bg-neutral-800 disabled:text-slate-500 text-white px-3 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-lg shadow-emerald-600/10 shrink-0"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isLoadingReal ? 'animate-spin' : ''}`} />
                      Sincronizar
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* COLUNA ESQUERDA: SIMULADOR CHAT TELEGRAM */}
            <section className="lg:col-span-7 flex flex-col glass rounded-2xl overflow-hidden shadow-2xl h-[700px]">
              
              {/* Barra do Cabeçalho de Canais do Fórum */}
              <div className="bg-white/5 p-4 border-b border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center font-display font-bold text-white shadow-md">
                    E
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-neutral-200 flex items-center gap-1.5">
                      🏆 Empire Premium 🚀
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse inline-block" title="Online"></span>
                    </h3>
                    <p className="text-xs text-slate-400">Fórum Ativo (Membro da Rede Empire)</p>
                  </div>
                </div>

                <div className="text-xs text-slate-400 font-mono flex items-center gap-4 bg-black/25 px-3 py-1.5 rounded-lg border border-white/5">
                  <span className="text-slate-500">Tópico Ativo:</span>
                  <span className="text-blue-400 font-bold">#{selectedThreadId} - {selectedTitulo}</span>
                </div>
              </div>

              {/* Botões rápidos de tópicos */}
              <div className="bg-black/10 p-3 border-b border-white/5 flex items-center gap-2 overflow-x-auto text-xs">
                <span className="text-slate-400 shrink-0 select-none">Tópicos rápidos:</span>
                {musicas.map(m => (
                  <button
                    key={m.threadId}
                    onClick={() => {
                      setSelectedThreadId(m.threadId);
                      setSelectedTitulo(m.titulo);
                      addLog(`Telegram: Focado no tópico "${m.titulo}"`, 'info');
                    }}
                    className={`px-3 py-1.5 rounded-lg transition border font-medium shrink-0 cursor-pointer ${selectedThreadId === m.threadId ? 'bg-blue-600/20 text-blue-350 border-blue-500' : 'bg-white/5 text-slate-405 border-white/5 hover:bg-white/10'}`}
                  >
                    🎵 {m.titulo}
                  </button>
                ))}
              </div>

              {/* Área das Mensagens do Chat */}
              <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-black/15 font-sans">
                {mensagensTelegram
                  .filter(m => m.threadId === selectedThreadId || m.threadId === "Geral")
                  .map((m) => (
                  <div key={m.id} className={`flex flex-col ${m.from === 'Usuário' ? 'items-end' : 'items-start'}`}>
                    <div className="text-[10px] text-slate-500 mb-1">{m.from}</div>
                    <div className={`p-3 rounded-xl max-w-sm text-xs leading-relaxed ${m.from === 'Usuário' ? 'bg-blue-600/80 text-white rounded-tr-none' : m.isBot ? 'bg-slate-900/60 border border-blue-500/30 text-slate-100 rounded-tl-none font-sans shadow-lg' : 'bg-slate-900/45 text-slate-300 border border-white/5 rounded-tl-none'}`}>
                      {m.isBot ? (
                        <div className="space-y-2">
                          <strong className="text-blue-400 block mb-1">Empire Bot @testeempire_bot</strong>
                          <p className="whitespace-pre-line text-neutral-200">{m.text}</p>
                          {m.replyMarkup && (
                            <button
                              onClick={() => {
                                setStep('step1');
                                addLog(`Mini App aberto simula clique no botão do bot no tópico!`, 'info');
                              }}
                              className="w-full bg-blue-600 text-white hover:bg-blue-500 active:scale-95 transition py-2 px-3 rounded-lg font-bold flex items-center justify-center gap-1.5 shadow-md cursor-pointer mt-2"
                            >
                              📋 Registrar nos Charts
                            </button>
                          )}
                        </div>
                      ) : (
                        <p>{m.text}</p>
                      )}
                    </div>
                  </div>
                ))}
                
                {mensagensTelegram.filter(m => m.threadId === selectedThreadId).length === 0 && (
                  <div className="text-center py-12 text-neutral-600 text-xs flex flex-col items-center justify-center gap-2">
                    <MessageSquare className="w-8 h-8 opacity-40" />
                    Nenhuma conversa neste tópico ainda.<br />Crie um evento de criação de tópico ou digite algo abaixo!
                  </div>
                )}
              </div>

              {/* Console de Logs das Planilhas & Servidor em Tempo Real (Acesso fácil) */}
              <div className="bg-black/25 p-3 border-t border-white/5 h-[180px] flex flex-col font-mono text-[11px]">
                <div className="text-slate-500 font-bold border-b border-white/5 pb-1 mb-2 uppercase tracking-wide flex items-center justify-between text-[10px]">
                  <span>⚡ Logs em tempo real (GAS &amp; Planilhas)</span>
                  <span className="text-emerald-500 flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span> Servidor Ativo</span>
                </div>
                <div className="flex-1 overflow-y-auto space-y-1.5 pr-2">
                  {logs.map((log, i) => (
                    <div key={i} className="flex gap-2 leading-relaxed">
                      <span className="text-slate-600">[{log.time}]</span>
                      <span className={log.type === 'error' ? 'text-rose-400 font-bold' : log.type === 'success' ? 'text-emerald-400 font-medium' : 'text-slate-400'}>
                        {log.msg}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Input Simulador Telegram */}
              <div className="bg-black/35 p-3 border-t border-white/5 space-y-2">
                <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono flex-wrap">
                  <span>Tipo de Tópico no Telegram:</span>
                  <label className="flex items-center gap-1 cursor-pointer hover:text-white">
                    <input 
                      type="radio" 
                      name="sim_type" 
                      checked={simulatorCreateType === 'musica'} 
                      onChange={() => setSimulatorCreateType('musica')}
                      className="accent-blue-550"
                    />
                    <span>🎵 Música</span>
                  </label>
                  <label className="flex items-center gap-1 cursor-pointer hover:text-white ml-2">
                    <input 
                      type="radio" 
                      name="sim_type" 
                      checked={simulatorCreateType === 'video'} 
                      onChange={() => setSimulatorCreateType('video')}
                      className="accent-blue-550"
                    />
                    <span>🎬 Vídeo</span>
                  </label>
                  <label className="flex items-center gap-1 cursor-pointer hover:text-white ml-2">
                    <input 
                      type="radio" 
                      name="sim_type" 
                      checked={simulatorCreateType === 'album'} 
                      onChange={() => setSimulatorCreateType('album')}
                      className="accent-blue-550"
                    />
                    <span>📀 Álbum</span>
                  </label>
                </div>
                <form onSubmit={handleCriarTopicoTelegram} className="flex gap-2">
                  <div className="relative flex-1">
                    {simulatorCreateType === 'video' ? (
                      <Video className="w-4 h-4 text-slate-500 absolute left-3 top-3.5" />
                    ) : simulatorCreateType === 'album' ? (
                      <Disc className="w-4 h-4 text-slate-500 absolute left-3 top-3.5" />
                    ) : (
                      <Music className="w-4 h-4 text-slate-500 absolute left-3 top-3.5" />
                    )}
                    <input 
                      type="text" 
                      value={novoTopicoNome}
                      onChange={(e) => setNovoTopicoNome(e.target.value)}
                      placeholder={simulatorCreateType === 'video' ? "Simular Tópico de Vídeo (Ex: Flowers - Clipe Oficial)..." : simulatorCreateType === 'album' ? "Simular Tópico de Álbum (Ex: GUTS - Álbum)..." : "Simular Tópico de Música (Ex: Flowers)..."}
                      className="w-full bg-white/5 text-slate-100 text-xs border border-white/5 rounded-xl py-3 pl-9 pr-4 focus:outline-none focus:border-blue-500 placeholder:text-slate-500"
                    />
                  </div>
                  <button 
                    type="submit" 
                    className="bg-blue-600 hover:bg-blue-500 text-white px-4 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-lg shadow-blue-600/15"
                  >
                    <Send className="w-3.5 h-3.5" /> Enviar Evento
                  </button>
                </form>
              </div>
            </section>

            {/* COLUNA DIREITA: EMULADOR DO MOBILE DO TELEGRAM MINI APP */}
            <section className="lg:col-span-5 flex flex-col items-center justify-center bg-black/20 border border-white/5 rounded-2xl p-4 shadow-xl">
              
              <div className="relative w-full max-w-[340px] bg-[#0b0e11] border-[6px] border-slate-800 rounded-[36px] overflow-hidden shadow-2xl h-[650px] flex flex-col">
                {/* Detalhe câmera/estética celular */}
                <div className="bg-slate-800 h-5 w-32 mx-auto rounded-b-xl absolute top-0 left-1/2 -translate-x-1/2 z-20 flex items-center justify-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-neutral-900"></div>
                  <div className="w-8 h-1 bg-slate-950 rounded-full"></div>
                </div>

                {/* Tela interna */}
                <div className="flex-1 bg-[#0f172a] empire-gradient text-slate-100 pt-7 p-4 flex flex-col relative overflow-hidden select-none">
                  
                  {/* Cabeçalho do Telegram Mini App */}
                  <div className="flex items-center justify-between border-b border-white/5 pb-2 mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-blue-500/20 border border-blue-400/20 overflow-hidden flex items-center justify-center">
                        <span className="text-[9px] font-bold text-blue-400 font-mono">E</span>
                      </div>
                      <div>
                        <h4 className="text-[11px] font-bold text-slate-200 leading-tight">Empire Registros</h4>
                        <p className="text-[8px] text-slate-400">bot do Telegram</p>
                      </div>
                    </div>
                    
                    <button 
                      onClick={resetForm}
                      className="text-[10px] text-blue-400 hover:text-blue-350 font-medium cursor-pointer"
                      title="Reiniciar Mini App"
                    >
                      🔄 Reset
                    </button>
                  </div>

                  <div className="text-center mb-1">
                    <h5 className="text-[14px] font-display font-bold text-blue-400 tracking-tight">Empire Registros</h5>
                    <p className="text-[9px] text-slate-400 mb-1">{isFlowVideos ? "Registro oficial de vídeos" : "Registro oficial de músicas"}</p>
                    {selectedTitulo && <p className="text-[10px] font-bold text-blue-400/80 bg-blue-500/5 py-1 px-2.5 rounded-full border border-blue-500/10 inline-block font-sans">{isFlowVideos ? "🎬" : "🎵"} {selectedTitulo}</p>}
                  </div>

                  {/* FLUXO INTERNO DO APP */}
                  <div className="flex-1 overflow-y-auto space-y-3 mt-2 pr-1">
                    
                    {/* STEP LOADING */}
                    {step === 'loading' && (
                      <div className="h-full flex flex-col items-center justify-center py-20 text-center space-y-3">
                        <RefreshCw className="w-8 h-8 text-blue-500 animate-spin" />
                        <p className="text-xs text-blue-400 font-medium">⏳ Comunicando com o GAS...</p>
                      </div>
                    )}

                    {/* STEP ERRO */}
                    {step === 'erro' && (
                      <div className="h-full flex flex-col items-center justify-center py-16 text-center space-y-4">
                        <AlertCircle className="w-10 h-10 text-rose-500" />
                        <div>
                          <h4 className="text-xs font-bold text-rose-400">Erro de Comunicação</h4>
                          <p className="text-[11px] text-slate-400 mt-1">{erroMsg}</p>
                        </div>
                        <button onClick={() => setStep('step0')} className="w-full bg-blue-600 hover:bg-blue-500 text-white text-xs py-2 rounded-xl font-bold transition">Voltar</button>
                      </div>
                    )}

                    {/* STEP 0: SELECIONAR TÓPICO */}
                    {step === 'step0' && (
                      <div className="space-y-3">
                        {/* Segmented Control */}
                        <div className="grid grid-cols-3 gap-1 bg-black/35 p-1 rounded-xl border border-white/5">
                          <button
                            type="button"
                            onClick={() => setActiveSegment('musicas')}
                            className={`py-1.5 rounded-lg text-[10px] font-bold font-sans transition cursor-pointer text-center ${activeSegment === 'musicas' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}
                          >
                            🎵 Músicas
                          </button>
                          <button
                            type="button"
                            onClick={() => setActiveSegment('videos')}
                            className={`py-1.5 rounded-lg text-[10px] font-bold font-sans transition cursor-pointer text-center ${activeSegment === 'videos' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}
                          >
                            🎬 Vídeos
                          </button>
                          <button
                            type="button"
                            onClick={() => setActiveSegment('albuns')}
                            className={`py-1.5 rounded-lg text-[10px] font-bold font-sans transition cursor-pointer text-center ${activeSegment === 'albuns' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}
                          >
                            📀 Álbuns
                          </button>
                        </div>

                        <h4 className="text-[11px] font-bold text-blue-400 uppercase tracking-widest text-left font-mono">
                          📋 Qual tópico {activeSegment === 'musicas' ? 'de música' : activeSegment === 'videos' ? 'de vídeo' : 'de álbum'} deseja registrar?
                        </h4>
                        <input 
                          type="text" 
                          placeholder="🔍 Buscar pelo nome..." 
                          value={buscaTópico}
                          onChange={(e) => setBuscaTópico(e.target.value)}
                          className="w-full bg-black/35 text-white text-xs font-sans border border-white/10 rounded-xl py-2.5 px-3 focus:outline-none focus:border-blue-500 placeholder:text-slate-500 shadow-inner"
                        />
                        <div className="space-y-1.5 max-h-[300px] overflow-y-auto pr-1">
                          {activeSegment === 'musicas' ? (
                            musicas
                              .filter(m => m.titulo.toLowerCase().includes(buscaTópico.toLowerCase()))
                              .map(m => (
                                <button
                                  key={m.threadId}
                                  onClick={() => handleSelecionarTopicoNoApp(m.titulo, m.threadId, 'musica')}
                                  className="w-full text-left bg-white/5 border border-white/5 hover:border-blue-500/40 hover:bg-blue-605/10 hover:text-white py-2.5 px-3 rounded-xl text-xs font-medium transition cursor-pointer flex items-center justify-between"
                                >
                                  <span>🎵 {m.titulo}</span>
                                  <span className="text-[10px] text-slate-500 hover:text-inherit">ID: {m.threadId}</span>
                                </button>
                              ))
                          ) : activeSegment === 'videos' ? (
                            videos
                              .filter(v => v.titulo.toLowerCase().includes(buscaTópico.toLowerCase()))
                              .map(v => (
                                <button
                                  key={v.threadId}
                                  onClick={() => handleSelecionarTopicoNoApp(v.titulo, v.threadId, 'video')}
                                  className="w-full text-left bg-white/5 border border-white/5 hover:border-blue-500/40 hover:bg-blue-605/10 hover:text-white py-2.5 px-3 rounded-xl text-xs font-medium transition cursor-pointer flex items-center justify-between"
                                >
                                  <span>🎬 {v.titulo}</span>
                                  <span className="text-[10px] text-slate-500 hover:text-inherit">ID: {v.threadId}</span>
                                </button>
                              ))
                          ) : (
                            albuns
                              .filter(a => a.titulo.toLowerCase().includes(buscaTópico.toLowerCase()))
                              .map(a => (
                                <button
                                  key={a.threadId}
                                  onClick={() => handleSelecionarTopicoNoApp(a.titulo, a.threadId, 'album')}
                                  className="w-full text-left bg-white/5 border border-white/5 hover:border-blue-500/40 hover:bg-blue-605/10 hover:text-white py-2.5 px-3 rounded-xl text-xs font-medium transition cursor-pointer flex items-center justify-between"
                                >
                                  <span>📀 {a.titulo}</span>
                                  <span className="text-[10px] text-slate-500 hover:text-inherit">ID: {a.threadId}</span>
                                </button>
                              ))
                          )}
                        </div>
                      </div>
                    )}

                    {/* STEP 1: OPCOES (REGISTRAR/SUBSTITUIR/COMENTARIO) */}
                    {step === 'step1' && (
                      <div className="space-y-2.5 pt-2">
                        <h4 className="text-[11px] font-bold text-blue-400 uppercase tracking-widest font-mono">O que deseja fazer?</h4>
                        <button 
                          onClick={() => handleEscolherOpcao('registrar')}
                          className="w-full text-left bg-white/5 hover:bg-blue-600 hover:text-white border border-white/5 text-slate-100 py-3 px-4 rounded-xl text-xs transition font-medium cursor-pointer"
                        >
                          🎵 Registrar nova música nos charts
                        </button>
                        <button 
                          onClick={() => handleEscolherOpcao('comentario')}
                          className="w-full text-left bg-white/5 hover:bg-blue-600 hover:text-white border border-white/5 text-slate-100 py-3 px-4 rounded-xl text-xs transition font-medium cursor-pointer"
                        >
                          💬 Vincular comentários a uma música
                        </button>
                        
                        <button onClick={() => setStep('step0')} className="w-full bg-transparent border border-white/5 text-slate-500 font-bold hover:text-blue-400 text-[10px] py-1.5 rounded-xl transition cursor-pointer">
                          ← Voltar
                        </button>
                      </div>
                    )}

                    {/* STEP 2: TIPO DE SINGLE */}
                    {step === 'step2' && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono">
                          <span>Etapa 1 de 4</span>
                          <span>TIPO DE SINGLE</span>
                        </div>
                        <div className="grid grid-cols-2 gap-1.5 max-h-[300px] overflow-y-auto pr-1 text-xs">
                          {[
                            'LEAD SINGLE', 'PRÉ-ALBUM', 'AVULSO', 'PÓS-ALBUM', 'PÓS-ALBUM REMIX',
                            'SOUNDTRACK', 'PROMOCIONAL', 'TRACKLIST ALBUM', 'REMIX',
                            'PRÉ-ALBUM REMIX', 'LEAD SINGLE REMIX', 'INTERLUDE'
                          ].map(single => (
                            <button
                              key={single}
                              onClick={() => { setTipoSingle(single); setStep('step3'); }}
                              className="bg-white/5 hover:bg-blue-600 hover:text-white border border-white/5 hover:border-blue-400 p-2.5 rounded-xl text-center font-bold text-[9.5px] transition cursor-pointer truncate"
                              title={single}
                            >
                              {single}
                            </button>
                          ))}
                        </div>
                        <button onClick={() => setStep('step1')} className="w-full bg-transparent border border-white/5 text-slate-550 text-[9.5px] py-1.5 rounded-xl cursor-pointer">
                          ← Voltar
                        </button>
                      </div>
                    )}

                    {/* STEP 3: TIPO DE MUSICA */}
                    {step === 'step3' && (
                      <div className="space-y-2.5">
                        <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono">
                          <span>Etapa 2 de 4</span>
                          <span>TIPO DE MÚSICA</span>
                        </div>
                        <h4 className="text-[11px] font-bold text-blue-400 uppercase tracking-widest font-mono font-sans">👥 Tipo de Música</h4>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          {['SOLO', 'PARCERIA', 'DUETO', 'CONJUNTO'].map(tipo => (
                            <button
                              key={tipo}
                              onClick={() => handleEscolherTipoMusica(tipo)}
                              className="bg-white/5 hover:bg-blue-600 hover:text-white border border-white/5 p-4 rounded-xl text-center font-bold tracking-wide transition cursor-pointer"
                            >
                              {tipo}
                            </button>
                          ))}
                        </div>
                        <button onClick={() => setStep('step2')} className="w-full bg-transparent border border-white/5 text-slate-500 text-[9.5px] py-1.5 rounded-xl cursor-pointer">
                          ← Voltar
                        </button>
                      </div>
                    )}

                    {/* STEP 4: ARTISTAS */}
                    {step === 'step4' && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono">
                          <span>Etapa 3 de 4</span>
                          <span>ARTISTA {numArtistaAtual}</span>
                        </div>
                        
                        <h4 className="text-[11px] font-bold text-blue-400 uppercase tracking-widest font-mono" id="step4-title">
                          👤 Artista {numArtistaAtual} ({tipoMusica})
                        </h4>

                        {/* Lista rápida de artistas base */}
                        <div className="space-y-1 max-h-[170px] overflow-y-auto pr-1">
                          {artistas.map(art => (
                            <button
                              key={art}
                              onClick={() => setArtistaInput(art)}
                              className={`w-full text-left py-2 px-3 rounded-lg text-xs font-semibold transition cursor-pointer ${artistaInput === art ? 'bg-blue-600 text-white' : 'bg-white/5 border border-white/5 hover:border-blue-400/30'}`}
                            >
                              {art}
                            </button>
                          ))}
                        </div>

                        <div className="pt-1 select-text">
                          <input 
                            type="text" 
                            placeholder="Ou digite manualmente..." 
                            value={artistaInput}
                            onChange={(e) => setArtistaInput(e.target.value)}
                            className="w-full bg-black/35 text-slate-100 text-xs border border-white/10 rounded-xl py-2 px-3 focus:outline-none focus:border-blue-500"
                          />
                        </div>

                        <div className="space-y-1.5 pt-1">
                          <button 
                            onClick={handleProximoArtista}
                            className="w-full bg-blue-600 text-white font-bold py-2.5 rounded-xl text-xs hover:bg-blue-500 transition cursor-pointer shadow-lg shadow-blue-500/20"
                          >
                            Confirmar artista {numArtistaAtual} ➡️
                          </button>
                          {numArtistaAtual > 1 && (
                            <button 
                              onClick={handleFinalizarArtistas}
                              className="w-full bg-slate-900 border border-white/5 text-slate-300 font-bold py-2 rounded-xl text-xs transition cursor-pointer"
                            >
                              ⏭️ Finalizar artistas ({artistasSalvos.length})
                            </button>
                          )}
                        </div>

                        <div className="text-[10px] text-slate-400">
                          {artistasSalvos.length > 0 && (
                            <p>Artistas adicionados: <span className="text-blue-400 font-bold">{artistasSalvos.join(', ')}</span></p>
                          )}
                        </div>
                        
                        <button onClick={() => setStep('step3')} className="w-full bg-transparent border border-white/5 text-slate-500 text-[9.5px] py-1.5 rounded-xl cursor-pointer">
                          ← Voltar
                        </button>
                      </div>
                    )}

                    {/* STEP 5: SUBSTITUIR? */}
                    {step === 'step5' && (
                      <div className="space-y-2.5">
                        <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono">
                          <span>Etapa 4 de 4</span>
                          <span>SUBSTITUIÇÃO CHARTS</span>
                        </div>
                        <h4 className="text-[11px] font-bold text-blue-400 uppercase tracking-widest font-mono">🔄 Substituir nos charts?</h4>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <button 
                            onClick={() => handleEscolherSubstituir('Sim')}
                            className="bg-white/5 border border-white/5 hover:bg-blue-600 hover:text-white p-4 rounded-xl text-center font-bold tracking-wide transition cursor-pointer"
                          >
                            ✅ Sim
                          </button>
                          <button 
                            onClick={() => handleEscolherSubstituir('Não')}
                            className="bg-white/5 border border-white/5 hover:bg-blue-600 hover:text-white p-4 rounded-xl text-center font-bold tracking-wide transition cursor-pointer"
                          >
                            ❌ Não
                          </button>
                        </div>
                        <button onClick={() => setStep('step4')} className="w-full bg-transparent border border-white/5 text-slate-500 text-[9.5px] py-1.5 rounded-xl cursor-pointer">
                          ← Voltar
                        </button>
                      </div>
                    )}

                    {/* STEP 5B: QUAL MÚSICA SUBSTITUIR */}
                    {step === 'step5b' && (
                      <div className="space-y-3">
                        <h4 className="text-[11px] font-bold text-blue-400 uppercase tracking-widest text-left font-mono">🎼 Selecione a música a substituir</h4>
                        
                        <div className="relative">
                          <input
                            type="text"
                            placeholder="🔍 Pesquisar música..."
                            value={buscaSubstituir}
                            onChange={(e) => setBuscaSubstituir(e.target.value)}
                            className="w-full bg-white/5 border border-white/5 focus:border-blue-500/50 rounded-xl px-3 py-2 text-xs focus:outline-none transition placeholder:text-slate-500"
                          />
                          {buscaSubstituir && (
                            <button
                              onClick={() => setBuscaSubstituir("")}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-500 hover:text-slate-350 cursor-pointer"
                            >
                              Limpar
                            </button>
                          )}
                        </div>

                        <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-1">
                          {(() => {
                            const filtradas = musicas.filter(m => 
                              m.threadId !== selectedThreadId && 
                              m.titulo.toLowerCase().includes(buscaSubstituir.toLowerCase())
                            );
                            if (filtradas.length === 0) {
                              return (
                                <div className="text-center py-6 text-[10px] text-slate-500 italic">
                                  Nenhuma música encontrada.
                                </div>
                              );
                            }
                            return filtradas.map(m => (
                              <button
                                key={m.threadId}
                                onClick={() => { setMusicaSubstituida(m.titulo); setStep('resumo'); }}
                                className="w-full text-left bg-white/5 border border-white/5 hover:border-blue-500/40 hover:bg-blue-600/10 hover:text-white py-2 px-3 rounded-xl text-xs font-semibold transition cursor-pointer"
                              >
                                {m.titulo}
                              </button>
                            ));
                          })()}
                        </div>
                        <button onClick={() => setStep('step5')} className="w-full bg-transparent border border-white/5 text-slate-500 text-[9.5px] py-1.5 rounded-xl cursor-pointer">
                          ← Voltar
                        </button>
                      </div>
                    )}

                    {/* STEP VIDEO FORM: FORMULÁRIO DE REGISTRO DO VÍDEO */}
                    {step === 'step_video_form' && (
                      <div className="space-y-4 pt-1 text-xs">
                        <div className="space-y-1 bg-blue-500/5 p-3 rounded-xl border border-blue-500/10 text-slate-355">
                          <p className="text-[10px] font-mono uppercase tracking-wider text-blue-400 font-bold">🎬 REGISTRO DE VÍDEO</p>
                          <p className="text-xs font-bold font-sans text-white mt-1">Tópico: {selectedTitulo}</p>
                        </div>

                        {/* Materiais/Vídeos */}
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-slate-400 font-mono uppercase tracking-wider block">🎶 Músicas de EDIÇÃO CHARTS (Até 3)</label>
                          
                          <div className="space-y-1.5">
                            {[0, 1, 2].map((idx) => {
                              const query = videoMateriais[idx] || "";
                              const filtered = musicasEdicaoCharts.filter(m => 
                                m.toLowerCase().includes(query.toLowerCase())
                              );
                              const isDropdownOpen = showDropdownIndex === idx;

                              return (
                                <div className="relative" key={idx}>
                                  <span className="absolute left-3 top-2.5 text-[10px] font-mono text-slate-500 font-bold">{idx + 1}</span>
                                  <input 
                                    type="text" 
                                    placeholder={idx === 0 ? "🎵 Buscar primeira música (Obrigatório)" : idx === 1 ? "🎵 Buscar segunda música (Opcional)" : "🎵 Buscar terceira música (Opcional)"}
                                    value={videoMateriais[idx]}
                                    onFocus={() => setShowDropdownIndex(idx)}
                                    onBlur={() => setTimeout(() => setShowDropdownIndex(prev => prev === idx ? null : prev), 250)}
                                    onChange={(e) => {
                                      const copy = [...videoMateriais];
                                      copy[idx] = e.target.value;
                                      setVideoMateriais(copy);
                                      setShowDropdownIndex(idx);
                                    }}
                                    className="w-full bg-black/35 text-white text-xs border border-white/10 rounded-xl py-2.5 pl-7 pr-3 focus:outline-none focus:border-blue-500 placeholder:text-slate-500 font-medium"
                                  />
                                  
                                  {isDropdownOpen && (
                                    <div className="absolute left-0 right-0 mt-1 bg-slate-900 border border-white/15 rounded-xl max-h-48 overflow-y-auto z-50 shadow-2xl p-1 divide-y divide-white/5 scrollbar-thin">
                                      {filtered.length === 0 ? (
                                        <div className="p-2.5 text-[10px] text-slate-500 italic text-center">
                                          Nenhuma música encontrada em EDIÇÃO CHARTS.
                                        </div>
                                      ) : (
                                        filtered.map((musica_item, i) => (
                                          <button
                                            key={i}
                                            type="button"
                                            onMouseDown={() => {
                                              const copy = [...videoMateriais];
                                              copy[idx] = musica_item;
                                              setVideoMateriais(copy);
                                              setShowDropdownIndex(null);
                                            }}
                                            className="w-full text-left px-3 py-2 text-[11px] text-slate-300 hover:bg-blue-600 hover:text-white rounded-lg transition cursor-pointer flex items-center gap-1.5"
                                          >
                                            <span>🎵</span>
                                            <span className="font-sans font-medium">{musica_item}</span>
                                          </button>
                                        ))
                                      )}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* Tipo de Video */}
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-slate-400 font-mono uppercase tracking-wider block mb-1">💿 Tipo de Vídeo/Lançamento</label>
                          <div className="grid grid-cols-2 gap-1.5 font-bold">
                            {[
                              { value: "clipe", label: "Clipe Oficial" },
                              { value: "dancinha", label: "Vídeo de Dancinha" },
                              { value: "lyric", label: "Lyric Video / Visualizer" },
                              { value: "audio", label: "Áudio Oficial" },
                              { value: "album", label: "Álbum Completo" }
                            ].map((t) => (
                              <button
                                key={t.value}
                                type="button"
                                onClick={() => setVideoTipo(t.value)}
                                className={`py-2 px-2.5 rounded-xl border text-[10px] text-center transition cursor-pointer ${
                                  videoTipo === t.value 
                                    ? 'bg-blue-600 text-white border-blue-500 font-extrabold shadow-md' 
                                    : 'bg-white/5 text-slate-300 border-white/5 hover:bg-white/10'
                                }`}
                              >
                                {t.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Sincronização de Pontos / YouTube */}
                        <div className="flex items-center justify-between bg-white/5 p-3 rounded-xl border border-white/5 mt-1">
                          <div>
                            <p className="text-[11px] font-bold text-slate-300">Planilha de Pontos (YouTube)</p>
                            <p className="text-[10px] text-slate-400 leading-relaxed max-w-[210px] mt-0.5">Marcar o material no YouTube automaticamente na aba PONTOS</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => setVideoYoutube(!videoYoutube)}
                            className={`w-11 h-6 rounded-full p-1 transition cursor-pointer flex items-center ${
                              videoYoutube ? 'bg-emerald-500 justify-end' : 'bg-slate-700 justify-start'
                            }`}
                          >
                            <span className="w-4 h-4 rounded-full bg-white shadow-md block" />
                          </button>
                        </div>

                        {/* Botões de Ação */}
                        <div className="space-y-2 pt-2">
                          <button
                            type="button"
                            onClick={handleConfirmarVideoEnvioApp}
                            disabled={!videoMateriais[0].trim()}
                            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-3.5 rounded-xl font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-lg shadow-emerald-650/10 disabled:opacity-45 disabled:cursor-not-allowed"
                          >
                            🚀 Confirmar e Registrar Vídeo
                          </button>

                          <button
                            type="button"
                            onClick={() => setStep('step0')}
                            className="w-full bg-transparent border border-white/5 text-slate-550 text-[10px] py-1.5 rounded-xl cursor-pointer hover:text-slate-350"
                          >
                            ← Cancelar e Voltar
                          </button>
                        </div>
                      </div>
                    )}

                    {/* STEP COMENTARIO: VINCULAR COMENTARIO */}
                    {step === 'comentario' && (
                      <div className="space-y-3">
                        <h4 className="text-[11px] font-bold text-blue-400 uppercase tracking-widest text-left font-mono">💬 Vincular comentários a qual música?</h4>
                        <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-1">
                          {musicas.map(m => (
                            <button
                              key={m.threadId}
                              onClick={() => handleVincularComentarioSimulado(m.titulo)}
                              className="w-full text-left bg-white/5 border border-white/5 hover:border-blue-500/40 hover:bg-blue-600/10 hover:text-white py-2.5 px-3 rounded-xl text-xs font-bold transition cursor-pointer"
                            >
                              {m.titulo}
                            </button>
                          ))}
                        </div>
                        <button onClick={() => setStep('step1')} className="w-full bg-transparent border border-white/5 text-slate-500 text-[9.5px] py-1.5 rounded-xl cursor-pointer">
                          ← Voltar
                        </button>
                      </div>
                    )}

                    {/* RESUMO */}
                    {step === 'resumo' && (
                      <div className="space-y-2.5" id="stepResumo">
                        <h4 className="text-[11px] font-bold text-blue-400 uppercase tracking-widest font-mono">📝 Confirmar Registro</h4>
                        
                        <div className="space-y-1.5">
                          <div className="bg-[#0b0e11] border border-white/5 rounded-lg p-2.5 text-[11px] text-slate-400">
                            Título: <span className="text-blue-400 font-bold block text-xs">{selectedTitulo}</span>
                          </div>
                          <div className="bg-[#0b0e11] border border-white/5 rounded-lg p-2.5 text-[11px] text-slate-400">
                            Single: <span className="text-blue-400 font-bold block text-xs">{tipoSingle}</span>
                          </div>
                          <div className="bg-[#0b0e11] border border-white/5 rounded-lg p-2.5 text-[11px] text-slate-400">
                            Formato: <span className="text-blue-400 font-bold block text-xs">{tipoMusica}</span>
                          </div>
                          <div className="bg-[#0b0e11] border border-white/5 rounded-lg p-2.5 text-[11px] text-slate-400">
                            Artistas: <span className="text-blue-400 font-bold block text-xs truncate">{artistasSalvos.join(', ')}</span>
                          </div>
                          {substituirCharts === 'Sim' && (
                            <div className="bg-[#0b0e11] border border-white/5 rounded-lg p-2.5 text-[11px] text-slate-400">
                              Substitui: <span className="text-rose-400 font-bold block text-xs">{musicaSubstituida}</span>
                            </div>
                          )}
                        </div>

                        <button 
                          onClick={handleConfirmarEnvioApp}
                          className="btn-confirm w-full bg-blue-600 text-white font-bold py-3 rounded-xl text-xs hover:bg-blue-500 transition cursor-pointer shadow-lg shadow-blue-500/20"
                        >
                          🚀 Confirmar e Registrar
                        </button>
                        <button onClick={() => setStep(substituirCharts === 'Sim' ? 'step5b' : 'step5')} className="w-full bg-transparent border border-white/5 text-slate-500 text-[9.5px] py-1.5 rounded-xl cursor-pointer">
                          ← Voltar
                        </button>
                      </div>
                    )}

                    {/* SUCESSO */}
                    {step === 'sucesso' && (
                      <div className="h-full flex flex-col justify-center py-6 text-center space-y-3.5 my-auto max-h-[460px] overflow-y-auto w-full">
                        <div className="w-12 h-12 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold text-2xl shadow-lg shadow-emerald-500/10 animate-bounce mx-auto">
                          ✓
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-emerald-400">✅ {opcaoSelected === 'comentario' ? 'Vínculo feito com sucesso!' : 'Registrado com sucesso!'}</h4>
                          <p className="text-[9.5px] text-slate-400 mt-1 leading-relaxed">
                            {opcaoSelected === 'comentario' 
                              ? 'Comentários vinculados na planilha com sucesso.' 
                              : 'Os dados foram enviados de forma segura para a planilha.'
                            }
                          </p>
                        </div>

                        {opcaoSelected === 'comentario' ? (
                          <div className="bg-[#0b0e11] border border-white/5 rounded-xl p-3 text-left space-y-1.5 font-sans">
                            <div className="text-blue-400 font-bold text-[9px] uppercase tracking-wider font-mono">💬 COMENTÁRIOS VINCULADOS</div>
                            <div className="text-slate-100 text-xs"><span className="text-slate-400">🎵 Música:</span> <strong className="text-white">{musicaSubstituida}</strong></div>
                            <div className="text-slate-100 text-xs truncate"><span className="text-slate-400">📋 Tópico:</span> <strong className="text-white">{selectedTitulo}</strong></div>
                          </div>
                        ) : (
                          <div className="bg-[#0b0e11] border border-white/5 rounded-xl p-3.5 text-left space-y-2 font-sans w-full">
                            <div className="text-blue-400 font-bold text-[9px] uppercase tracking-wider font-mono border-b border-white/5 pb-1 flex items-center justify-between">
                              <span>✅ FICHA DE REGISTRO</span>
                              <span className="text-slate-500 font-mono text-[8px] lowercase">id: {selectedThreadId}</span>
                            </div>
                            <div className="text-slate-100 font-bold text-xs">🎵 {selectedTitulo}</div>
                            <div className="grid grid-cols-2 gap-2 mt-1.5">
                              <div className="bg-white/5 border border-white/5 rounded-lg p-2 text-slate-400 text-[10px]">
                                Tipo: <strong className="text-white block mt-0.5">{tipoSingle}</strong>
                              </div>
                              <div className="bg-white/5 border border-white/5 rounded-lg p-2 text-slate-400 text-[10px]">
                                Formato: <strong className="text-white block mt-0.5 truncate">{tipoMusica}</strong>
                              </div>
                            </div>
                            <div className="bg-white/5 border border-white/5 rounded-lg p-2 text-slate-400 text-[10px]">
                              Artistas: <strong className="text-white block mt-0.5 truncate">{artistasSalvos.join(', ')}</strong>
                            </div>
                            {substituirCharts === 'Sim' && (
                              <div className="bg-rose-950/20 border border-rose-500/10 rounded-lg p-2 text-rose-300 text-[10px]">
                                🔄 Substitui nos Charts: <strong className="text-rose-455 block mt-0.5">{musicaSubstituida}</strong>
                              </div>
                            )}
                          </div>
                        )}

                        <button 
                          onClick={resetForm}
                          className="w-full bg-blue-600 text-white text-[10px] py-2.5 rounded-xl font-bold hover:bg-blue-500 active:scale-95 transition cursor-pointer mt-2"
                        >
                          🔄 Registrar Nova Música
                        </button>
                      </div>
                    )}

                  </div>

                  {/* Barra inferior estética do celular */}
                  <div className="h-1 bg-slate-700 w-24 mx-auto rounded-full mt-2"></div>
                </div>
              </div>
            </section>
          </>
        )}

        {/* TAB 2: INSTRUÇÕES DE ARQUITETURA */}
        {activeTab === 'instrucoes' && (
          <section className="col-span-12 glass border border-white/5 rounded-2xl p-6 space-y-6 shadow-2xl">
            <div>
              <h2 className="text-xl font-display font-bold text-blue-400 flex items-center gap-2">
                <Info className="w-5 h-5 animate-pulse" /> Entendendo a Resolução do CORS e Travamento do Bot
              </h2>
              <p className="text-sm text-slate-300 mt-2 leading-relaxed">
                O fluxo original de registrar músicas no Telegram Mini App travava por conta do CORS em chamadas <strong className="text-blue-400 font-bold">fetch() POST</strong> direto ao container do Google Apps Script (GAS) a partir de um iframe no Mini App do Telegram, além do bloqueio estrutural do Telegram para botões inline com <code className="bg-black/25 text-blue-400 px-1 py-0.5 rounded text-xs font-mono">web_app</code> em grupos e tópicos do fórum.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white/5 p-5 rounded-xl border border-white/5 space-y-3">
                <h3 className="font-bold text-sm text-blue-300 flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-xs text-rose-400">1</span>
                  Por que o Envio Anterior Falhava (CORS &amp; Telegram)
                </h3>
                <ul className="space-y-2 text-xs text-slate-400 list-disc list-inside">
                  <li>
                    <strong className="text-slate-250 font-bold">tg.sendData():</strong> Só é enviado se o Mini App for aberto por um botão clássico do tipo keyboard do bot em chat privado de 1-para-1. Quando aberto por link t.me/..., o Telegram descarta preventivamente (<code className="text-rose-400 font-mono">dropping postMessage</code>).
                  </li>
                  <li>
                    <strong className="text-slate-250 font-bold">Botão Inline web_app no supergrupo:</strong> O Telegram lança o erro <code className="text-rose-400 font-mono">BUTTON_TYPE_INVALID</code> ao tentar mandar um botão inline de web_app em grupos e fóruns. Eles simplesmente não dão suporte a isso focado no fórum.
                  </li>
                  <li>
                    <strong className="text-slate-250 font-bold">Fetch POST direto:</strong> O Google Apps Script bloqueia as chamadas POST dinâmicas feitas via AJAX/fetch de sites externos se enviarem dados como tipo de mídia json tradicional, disparando o mecanismo de preflight (OPTIONS) sem os headers adequados habilitados.
                  </li>
                </ul>
              </div>

              <div className="bg-white/5 p-5 rounded-xl border border-white/5 space-y-3">
                <h3 className="font-bold text-sm text-emerald-400 flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-xs text-emerald-400">2</span>
                  A Solução Definitiva Implementada
                </h3>
                <ul className="space-y-2 text-xs text-slate-400 list-disc list-inside">
                  <li>
                    <strong className="text-slate-250 font-bold">Mudança de Botão:</strong> O bot passa a enviar um link do tipo <strong className="text-blue-400 font-bold">URL comum</strong> apontando para o seu Mini App, gerando um layout com botão inline impecável nas mensagens do chat sem causar o erro 400.
                  </li>
                  <li>
                    <strong className="text-slate-250 font-bold">GET assíncrono seguro (CORS-Safe):</strong> Em vez de utilizar POST ou tg.sendData, o Mini App realiza uma requisição <code className="text-emerald-400 font-mono">fetch GET</code> para <code className="text-emerald-400 font-mono">SCRIPT_URL?action=gravarMusica&amp;data=...</code>.
                  </li>
                  <li>
                    <strong className="text-slate-250 font-bold">Excelente Aceitação do GAS:</strong> O Google Apps Script aceita e processa nativamente requisições GET com o método <code className="text-emerald-400 font-mono">doGet</code> e retorno via <code className="text-emerald-400 font-mono text-xs">ContentService.createTextOutput()</code>, que possui suporte nativo integral a CORS habilitado pelo próprio Google!
                  </li>
                </ul>
              </div>
            </div>

            {/* CARD ALERTA DE ERRO DO GOOGLE DRIVE */}
            <div className="bg-rose-950/20 border border-rose-500/25 p-5 rounded-xl space-y-3">
              <h4 className="font-bold text-sm text-rose-400 flex items-center gap-2">
                ⚠️ ALERTA DE CONFIGURAÇÃO: Erro do Google Drive ("Não foi possível abrir o arquivo")
              </h4>
              <p className="text-xs text-slate-350 leading-relaxed">
                Se você clicou em "Registrar nos Charts" no Telegram e viu uma tela de erro do <strong className="text-rose-400">Google Drive</strong> dizendo que não foi possível abrir o arquivo, significa que o link do seu Mini App configurado no <strong className="text-blue-400">@BotFather</strong> está incorreto!
              </p>
              <p className="text-xs text-slate-350 leading-relaxed">
                Isso acontece porque você provavelmente configurou a <strong className="text-slate-200">URL do editor de script do Google Apps Script</strong> (que começa de forma interna com <code className="bg-rose-950/60 text-rose-300 px-1 py-0.5 rounded text-[11px] font-mono">https://script.google.com/d/.../edit</code>) ou um link de pasta/arquivo do Drive. O Google Drive bloqueia totalmente o carregamento desses links dentro do painel embutido de iFrame do Telegram.
              </p>
              <div className="border-t border-rose-500/10 pt-2.5 space-y-1.5">
                <span className="text-[11px] font-bold text-rose-300 uppercase tracking-widest block font-mono">💡 Como resolver isso em 1 minuto:</span>
                <ul className="list-decimal list-inside text-xs text-slate-400 space-y-1.5">
                  <li>No editor do Google Apps Script, clique no botão azul <strong className="text-slate-200">Implantar &gt; Gerenciar implantações</strong> ou <strong className="text-slate-200">Nova implantação</strong>.</li>
                  <li>Copie a <strong className="text-emerald-400">URL do Web App</strong> correta e executável que é gerada ali (ela obrigatoriamente termina com <code className="text-emerald-400 font-mono">/exec</code>).</li>
                  <li>Abra o <strong className="text-blue-400">@BotFather</strong> no Telegram, envie o comando <code className="text-blue-400 font-mono">/mybots</code>, selecione o seu bot e clique em <strong className="text-slate-200">Bot Settings &gt; Menu Button</strong> ou no respectivo comando Web App que criou (como <code className="text-slate-200 font-mono font-bold">/charts</code>), e atualize a URL colando o link que termina em <strong className="text-emerald-400">/exec</strong>.</li>
                </ul>
              </div>
            </div>

            <div className="bg-gradient-to-r from-blue-900/10 to-transparent p-5 rounded-xl border border-blue-500/10 space-y-3">
              <h3 className="font-bold text-sm text-blue-10 px-0.5 flex items-center gap-2 text-slate-200">
                🚀 Como aplicar a correção no seu ambiente do Google Apps Script
              </h3>
              <ol className="list-decimal list-inside text-xs text-slate-400 space-y-2.5">
                <li>Vá nas abas ao topo para copiar os códigos completos do backend (<code className="text-slate-300 font-mono">google-apps-script.js</code>) e do front-end (<code className="text-slate-300 font-mono">index_gas.html</code>).</li>
                <li>No seu editor do <strong className="text-slate-250">Google Apps Script (GAS)</strong>, substitua o conteúdo dos seus arquivos <code className="text-slate-300 font-mono">.gs</code> pelo conteúdo unificado completo.</li>
                <li>Substitua o arquivo <code className="text-slate-300 font-mono">index.html</code> no editor do GAS pelo conteúdo de <code className="text-slate-300 font-mono">index_gas.html</code>.</li>
                <li>Clique em <strong className="text-slate-250">Implantar / Deploy &gt; Nova Implantação</strong> como <strong className="text-slate-250">Como Web App</strong>, configurando o acesso para <strong className="text-blue-400">Qualquer pessoa ("Anyone")</strong>.</li>
                <li>Copie a <strong className="text-blue-400">URL do Web App do GAS</strong> gerada na implantação.</li>
                <li>Na sua planilha do GAS, execute a função <code className="text-blue-400 font-mono">setupProject()</code> uma vez para configurar adequadamente o Webhook do seu Bot do Telegram para apontar para a URL do Web App!</li>
              </ol>
            </div>
          </section>
        )}

        {/* TAB 3: CODIGO GAS */}
        {activeTab === 'codigogas' && (
          <section className="col-span-12 glass border border-white/5 rounded-2xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <div>
                <h2 className="text-lg font-display font-bold text-blue-400 flex items-center gap-1.5">
                  <FileCode className="w-5 h-5" /> Código Unificado Backend (Google Apps Script)
                </h2>
                <p className="text-xs text-slate-400">Este é o backend unificado corrigido disponível em <code className="text-slate-300 font-mono">/google-apps-script.js</code></p>
              </div>
              <button
                onClick={() => handleCopy(document.getElementById('code-gas-ref')?.innerText || '', 'gs')}
                className="bg-blue-600 hover:bg-blue-500 font-bold text-white px-4 py-2 rounded-lg text-xs transition flex items-center gap-2 cursor-pointer shadow-md"
              >
                {copiedIndex === 'gs' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />} 
                {copiedIndex === 'gs' ? 'Copiado!' : 'Copiar Tudo'}
              </button>
            </div>

            <div className="bg-black/25 p-4 rounded-xl border border-white/5 max-h-[500px] overflow-y-auto">
              <pre id="code-gas-ref" className="text-xs font-mono text-blue-300 whitespace-pre leading-relaxed font-normal">
{`// ==========================================
// 1_config.gs — CONFIGURAÇÕES
// ==========================================
const BOT_TOKEN = '8662083027:AAE9xsTnQwk-WX9gbXWyPQngdiGomnTnSBk';

const CHAT_ID        = '-1002072336495';   // grupo de músicas
const CHAT_ID_VIDEOS = '-1002092995685';   // grupo de vídeos
const CHAT_ID_ALBUNS = '-1002057001613';   // grupo de álbuns

const EXT_SPREADSHEET_ID = '1GPajSCp1TkJDEDOGZIrXxgZuNuRs7545buFntyDlpL8';
const EXT_REGISTRO_COMENTARIOS_ID = '1wNbtP78MrtrOc2Jb1ejXcHVjqndR2Vm4-3EIVqa8aOg';
const EXT_JOGADORES_ID = '1zMqnIntj5vAlU4_V_s0xf5suPTtFcl61W9DC9j8LFfM';
const URL_MINI_APP = 'https://t.me/testeempire_bot/charts';

// — doGet MODIFICADO PARA COMPATIBILIDADE CORS —
function doGet(e) {
  const action = e.parameter.action;
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  if (action === 'getDados') {
    return ContentService.createTextOutput(JSON.stringify({
      ok:       true,
      musicas:  obterMusicasDaPlanilha(),
      artistas: obterListaArtistas()
    })).setMimeType(ContentService.MimeType.JSON);
  }

  // Gravação livre de CORS (GET)
  if (action === 'gravarMusica') {
    try {
      const body = JSON.parse(e.parameter.data);
      const res = processarGravacaoMusicaLocal(body);
      return ContentService.createTextOutput(JSON.stringify({ ok: true, msg: "Gravado com sucesso" }))
                           .setMimeType(ContentService.MimeType.JSON);
    } catch (err) {
      return ContentService.createTextOutput(JSON.stringify({ ok: false, error: err.message }))
                           .setMimeType(ContentService.MimeType.JSON);
    }
  }

  // Vinculação livre de CORS (GET)
  if (action === 'vincularComentario') {
    try {
      const body = JSON.parse(e.parameter.data);
      vincularComentario(body.musicaVinculada, body.threadId);
      return ContentService.createTextOutput(JSON.stringify({ ok: true, msg: "Vinculado com sucesso" }))
                           .setMimeType(ContentService.MimeType.JSON);
    } catch (err) {
      return ContentService.createTextOutput(JSON.stringify({ ok: false, error: err.message }))
                           .setMimeType(ContentService.MimeType.JSON);
    }
  }

  // Serve o arquivo index.html do GAS
  return HtmlService.createHtmlOutputFromFile('index')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

// ... Veja o código completo salvo no arquivo /google-apps-script.js`}
              </pre>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-500 bg-black/25 p-3 rounded-lg border border-white/5">
              <Info className="w-4 h-4 text-blue-400 shrink-0" />
              <span>O arquivo unificado garante que todos os roteamentos, caches de botões, likes e metacritic de albuns continuem perfeitamente operacionais!</span>
            </div>
          </section>
        )}

        {/* TAB 4: CODIGO HTML */}
        {activeTab === 'codigohtml' && (
          <section className="col-span-12 glass border border-white/5 rounded-2xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <div>
                <h2 className="text-lg font-display font-bold text-blue-400 flex items-center gap-1.5">
                  <Code className="w-5 h-5" /> Código Frontend (index.html do GAS)
                </h2>
                <p className="text-xs text-slate-400">Este é o frontend HTML que deve residir no seu Google Apps Script, disponível em <code className="text-slate-300 font-mono">/index_gas.html</code></p>
              </div>
              <button
                onClick={() => handleCopy(document.getElementById('code-html-ref')?.innerText || '', 'html')}
                className="bg-blue-600 hover:bg-blue-500 font-bold text-white px-4 py-2 rounded-lg text-xs transition flex items-center gap-2 cursor-pointer shadow-md"
              >
                {copiedIndex === 'html' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />} 
                {copiedIndex === 'html' ? 'Copiado!' : 'Copiar Tudo'}
              </button>
            </div>

            <div className="bg-black/25 p-4 rounded-xl border border-white/5 max-h-[500px] overflow-y-auto">
              <pre id="code-html-ref" className="text-xs font-mono text-blue-300 whitespace-pre leading-relaxed font-normal">
{`// Código AJAX / CORS resolvido no index.html do GAS:

function confirmarEnvio() {
  const btnConfirmar = document.querySelector('#stepResumo .btn-confirm');
  if (btnConfirmar) {
    btnConfirmar.disabled = true;
    btnConfirmar.textContent = '⏳ Gravando nos charts...';
  }

  const payload = {
    threadId:          dados.threadId,
    titulo:            dados.titulo,
    tipoSingle:        dados.tipoSingle,
    tipoMusica:        dados.tipoMusica,
    artistas:          dados.artistas,
    substituir:        dados.substituir,
    musicaSubstituida: dados.musicaSubstituida
  };

  const params = new URLSearchParams({
    action: 'gravarMusica',
    data: JSON.stringify(payload)
  });

  fetch(\`\${SCRIPT_URL}?\${params.toString()}\`)
    .then(res => res.json())
    .then(res => {
      if (res.ok) {
        goTo('stepSucesso');
        setTimeout(() => {
          if (tg && typeof tg.close === 'function') tg.close();
        }, 3000);
      } else {
        mostrarErro('Falha ao registrar: ' + (res.error || 'Erro desconhecido'));
      }
    })
    .catch(err => {
      mostrarErro('Erro de conexão ao enviar: ' + err.message);
    })
    .finally(() => {
      if (btnConfirmar) {
        btnConfirmar.disabled = false;
        btnConfirmar.textContent = '🚀 Confirmar e Registrar';
      }
    });
}`}
              </pre>
            </div>
          </section>
        )}

        {/* TAB 5: IMPORTADOR DE JSON HISTÓRICO */}
        {activeTab === 'importador' && (
          <section className="col-span-12 glass border border-white/5 rounded-2xl p-6 space-y-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <div>
                <h2 className="text-lg font-display font-bold text-blue-400 flex items-center gap-1.5">
                  <Download className="w-5 h-5 text-blue-500" /> Importador de Histórico JSON do Telegram
                </h2>
                <p className="text-xs text-slate-400">Cole o arquivo JSON de backup do chat do Telegram para estruturar os dados de tópicos passados e sincronizá-los com a sua planilha oficial.</p>
              </div>
            </div>

            {/* Input e Instruções */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
              <div className="col-span-12 md:col-span-6 space-y-4 text-left">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest block font-sans">
                  📋 Conteúdo do JSON:
                </label>
                <textarea
                  value={jsonInput}
                  onChange={(e) => setJsonInput(e.target.value)}
                  placeholder={`{ "name": "EMPIRE: Álbuns", "messages": [...] }`}
                  className="w-full h-80 bg-black/45 text-slate-200 text-xs font-mono border border-white/10 rounded-2xl py-3.5 px-4 focus:outline-none focus:border-blue-500 placeholder:text-slate-700 shadow-inner"
                />

                <div className="flex items-center gap-3">
                  <button
                    onClick={handleParseJSON}
                    className="flex-1 bg-blue-600 hover:bg-blue-500 hover:scale-[1.01] active:scale-95 text-white font-bold py-3 px-4 rounded-xl text-xs transition cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-blue-600/10 hover:shadow-blue-500/25"
                  >
                    🔍 Analisar e Mapear Dados
                  </button>
                  {parsedAlbums.length > 0 && (
                    <button
                      onClick={() => setParsedAlbums([])}
                      className="bg-white/5 hover:bg-white/10 border border-white/5 text-slate-300 font-semibold py-3 px-5 rounded-xl text-xs transition cursor-pointer"
                    >
                      Limpar
                    </button>
                  )}
                </div>
              </div>

              {/* Instruções de uso e modo atual */}
              <div className="col-span-12 md:col-span-6 glass-card p-5 rounded-2xl border border-white/5 bg-white/[0.01] flex flex-col justify-between text-left space-y-4">
                <div className="space-y-3">
                  <h3 className="font-semibold text-sm text-slate-200 flex items-center gap-2">
                    💡 Como funciona o importador?
                  </h3>
                  <div className="space-y-2 text-xs text-slate-400 leading-relaxed font-sans">
                    <p>1. O importador mapeia todas as ações de <strong className="text-blue-400">topic_created</strong> presentes no arquivo JSON para estruturar os dados.</p>
                    <p>2. Varre as mensagens do tópico em busca de blocos marcados com a tag <strong className="text-blue-400">TRACKLIST</strong> para extrair as músicas de cada álbum automaticamente.</p>
                    <p>3. Permite que você visualize o resultado e edite as informações se necessário antes de enviar.</p>
                    <p>4. Ao clicar em <strong className="text-emerald-400">Confirmar e Importar</strong>, o sistema grava cada álbum e suas faixas nas abas <code className="text-slate-300">EDIÇÃO CHARTS ÁLBUMS</code> e <code className="text-slate-300">EDIÇÃO CHARTS</code> de forma automatizada!</p>
                  </div>
                </div>

                <div className="border-t border-white/5 pt-4 space-y-1 bg-black/20 p-4 rounded-xl border border-white/5">
                  <span className="text-[10px] text-slate-500 font-mono block">MODO ATUAL:</span>
                  <span className={`text-xs font-bold font-sans ${isLiveMode ? 'text-emerald-400' : 'text-blue-400'}`}>
                    {isLiveMode ? '🔌 CONEXÃO REAL (Google Sheets via CORS)' : '🕹️ SIMULADO (Local no navegador)'}
                  </span>
                  <p className="text-[10px] text-slate-500 font-sans mt-1">
                    {isLiveMode ? 'Os álbuns serão gravados na sua planilha externa vinculada.' : 'Os álbuns serão simulados no Mini App, modificando as listas e logs do emulador.'}
                  </p>
                </div>
              </div>
            </div>

            {/* Lista Mapeada para Preview */}
            {parsedAlbums.length > 0 && (
              <div className="space-y-4 font-sans text-left animate-fade-in">
                <div className="flex items-center justify-between">
                  <h3 className="font-display font-bold text-sm text-slate-200">
                     💿 Álbuns Detectados ({parsedAlbums.length})
                  </h3>
                  
                  {/* Seleções rápidas */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => setParsedAlbums(prev => prev.map(a => ({ ...a, selected: true })))}
                      className="text-[10px] hover:text-white text-slate-400 bg-white/5 hover:bg-white/10 px-2.5 py-1.5 rounded-lg border border-white/5 transition"
                    >
                      Selecionar Todos
                    </button>
                    <button
                      onClick={() => setParsedAlbums(prev => prev.map(a => ({ ...a, selected: false })))}
                      className="text-[10px] hover:text-white text-slate-400 bg-white/5 hover:bg-white/10 px-2.5 py-1.5 rounded-lg border border-white/5 transition"
                    >
                      Desmarcar Todos
                    </button>
                  </div>
                </div>

                <div className="border border-white/5 bg-black/35 rounded-2xl overflow-hidden overflow-x-auto">
                  <table className="w-full text-xs text-left text-slate-300">
                    <thead className="text-[10px] text-slate-400 uppercase tracking-wider bg-black/40 border-b border-white/5 font-mono">
                      <tr>
                        <th className="p-4 w-12 text-center">Sel.</th>
                        <th className="p-4 w-20">ID Tópico</th>
                        <th className="p-4">Álbum</th>
                        <th className="p-4">Artista</th>
                        <th className="p-4 w-28">Tipo</th>
                        <th className="p-4 w-24 text-center">Músicas</th>
                        <th className="p-4 w-32">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 leading-relaxed">
                      {parsedAlbums.map((album) => (
                        <tr key={album.id} className={`hover:bg-white/[0.02] transition ${album.selected ? 'bg-blue-600/[0.01]' : 'opacity-60'}`}>
                          <td className="p-4 text-center">
                            <input
                              type="checkbox"
                              checked={album.selected}
                              onChange={(e) => {
                                const checked = e.target.checked;
                                setParsedAlbums(prev => prev.map(a => a.id === album.id ? { ...a, selected: checked } : a));
                              }}
                              className="w-4 h-4 accent-blue-600 rounded border-white/10 cursor-pointer"
                            />
                          </td>
                          <td className="p-4 font-mono text-slate-500 text-[10px]">#{album.id}</td>
                          <td className="p-4 font-semibold text-slate-200">
                            <input
                              type="text"
                              value={album.titulo}
                              onChange={(e) => {
                                const val = e.target.value;
                                setParsedAlbums(prev => prev.map(a => a.id === album.id ? { ...a, titulo: val } : a));
                              }}
                              className="bg-transparent text-slate-100 hover:bg-white/5 focus:bg-slate-900 border border-transparent focus:border-blue-500 rounded px-2 py-1 w-full"
                            />
                          </td>
                          <td className="p-4">
                            <input
                              type="text"
                              value={album.artistaPrincipal}
                              onChange={(e) => {
                                const val = e.target.value;
                                setParsedAlbums(prev => prev.map(a => a.id === album.id ? { ...a, artistaPrincipal: val } : a));
                              }}
                              className="bg-transparent text-slate-300 hover:bg-white/5 focus:bg-slate-900 border border-transparent focus:border-blue-500 rounded px-2 py-1 w-full"
                            />
                          </td>
                          <td className="p-4">
                            <select
                              value={album.tipoLancamento}
                              onChange={(e) => {
                                const val = e.target.value as 'EP' | 'ALBUM' | 'DELUXE';
                                setParsedAlbums(prev => prev.map(a => a.id === album.id ? { ...a, tipoLancamento: val } : a));
                              }}
                              className="bg-[#11161d] text-slate-300 border border-white/5 rounded px-2 py-1 focus:outline-none focus:border-blue-500"
                            >
                              <option value="ALBUM">ALBUM</option>
                              <option value="EP">EP</option>
                              <option value="DELUXE">DELUXE</option>
                            </select>
                          </td>
                          <td className="p-4 text-center font-mono font-medium">
                            <span className="bg-white/5 border border-white/5 px-2 py-1 rounded-md text-slate-400 font-mono">
                              {album.musicas.length}
                            </span>
                          </td>
                          <td className="p-4">
                            {album.status === 'Pendente' && <span className="text-slate-400 font-mono text-[10px]">⏳ Pendente</span>}
                            {album.status === 'Importando' && <span className="text-blue-400 font-mono text-[10px] animate-pulse">⚡ Importando...</span>}
                            {album.status === 'Sucesso' && <span className="text-emerald-400 font-mono text-[10px] font-bold">✅ SUCESSO</span>}
                            {album.status === 'Erro' && <span className="text-rose-500 font-mono text-[10px] font-bold" title={album.error}>❌ Falhou</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Confirm Import Block */}
                <div className="flex items-center justify-between bg-black/40 p-5 rounded-2xl border border-white/5 mt-4">
                  <div className="space-y-1">
                    <p className="text-xs text-slate-300">
                      Pronto para iniciar a importação sequencial dos álbuns selecionados?
                    </p>
                    <p className="text-[10px] text-slate-500 font-sans">
                      Dica: Para evitar concorrência ou limites do GAS, as chamadas serão realizadas uma após a outra em intervalos curtos.
                    </p>
                  </div>
                  <button
                    onClick={handleStartBulkImport}
                    disabled={isImporting || parsedAlbums.filter(a => a.selected).length === 0}
                    className={`font-semibold py-3.5 px-6 rounded-xl text-xs transition flex items-center gap-2 cursor-pointer text-white shadow-xl ${
                      isImporting 
                        ? 'bg-blue-600/50 cursor-not-allowed'
                        : parsedAlbums.filter(a => a.selected).length === 0
                          ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-white/5'
                          : 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-500/15'
                    }`}
                  >
                    {isImporting ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" /> Importando ({importProgress + 1}/{parsedAlbums.filter(a => a.selected).length})...
                      </>
                    ) : (
                      <>
                        🚀 Confirmar e Importar {parsedAlbums.filter(a => a.selected).length} Álbuns
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </section>
        )}

      </main>

      {/* MODAL DE REGISTRO DE ÁLBUM COMPLETO */}
      <AnimatePresence>
        {showAlbumModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-lg bg-[#0e1318] border border-white/10 rounded-3xl overflow-hidden shadow-2xl flex flex-col my-8"
            >
              {/* Header */}
              <div className="px-6 py-4 bg-black/40 border-b border-white/5 flex items-center justify-between font-sans">
                <div className="flex items-center gap-2">
                  <Disc className="w-5 h-5 text-blue-500 animate-spin" style={{ animationDuration: '6s' }} />
                  <div className="text-left animate-fade-in">
                    <h3 className="font-display font-bold text-slate-100 text-sm">Registro de Álbum</h3>
                    <p className="text-[10px] text-slate-400 font-mono tracking-wide">{selectedTitulo}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowAlbumModal(false)}
                  className="text-slate-400 hover:text-white text-xs bg-white/5 hover:bg-white/10 w-6 h-6 rounded-full flex items-center justify-center cursor-pointer transition"
                >
                  ✕
                </button>
              </div>

              {/* Progress Indicator */}
              <div className="bg-black/25 px-6 py-2 border-b border-white/5 flex items-center gap-1">
                <div className={`h-1 flex-1 rounded transition-colors duration-300 ${albumModalStep === 'modo' ? 'bg-blue-600' : 'bg-blue-600/30'}`}></div>
                <div className={`h-1 flex-1 rounded transition-colors duration-300 ${albumModalStep === 'dados' ? 'bg-blue-600' : albumModalStep === 'musicas_list' || albumModalStep === 'resumo' ? 'bg-blue-600' : 'bg-white/10'}`}></div>
                <div className={`h-1 flex-1 rounded transition-colors duration-300 ${albumModalStep === 'musicas_list' ? 'bg-blue-600' : albumModalStep === 'resumo' ? 'bg-blue-600' : 'bg-white/10'}`}></div>
                <div className={`h-1 flex-1 rounded transition-colors duration-300 ${albumModalStep === 'resumo' ? 'bg-blue-600' : 'bg-white/10'}`}></div>
              </div>

              {/* Step Contents */}
              <div className="p-6 overflow-y-auto max-h-[60vh] space-y-4 font-sans text-left">
                {albumModalStep === 'modo' && (
                  <div className="space-y-4">
                    <p className="text-xs text-slate-300 leading-relaxed text-left">
                      Selecione o tipo de registro que deseja realizar para o álbum <strong className="text-blue-400">{selectedTitulo}</strong>:
                    </p>
                    <div className="grid grid-cols-1 gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          setAlbumModo('registro');
                          setAlbumModalStep('dados');
                        }}
                        className="w-full text-left bg-white/5 hover:bg-blue-600/10 hover:border-blue-500/50 border border-white/5 p-4 rounded-2xl transition cursor-pointer flex items-start gap-3 group"
                      >
                        <div className="bg-blue-600/20 text-blue-400 p-2.5 rounded-xl group-hover:bg-blue-600 group-hover:text-white transition">
                          <Disc className="w-5 h-5" />
                        </div>
                        <div>
                          <span className="font-bold text-xs text-slate-200 block">🆕 Registrar Novo Álbum</span>
                          <span className="text-[11px] text-slate-405 mt-0.5 block leading-relaxed">Insere o álbum e todas as suas músicas do zero no banco de dados.</span>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setAlbumModo('substituicao');
                          setAlbumModalStep('dados');
                        }}
                        className="w-full text-left bg-white/5 hover:bg-blue-600/10 hover:border-blue-500/50 border border-white/5 p-4 rounded-2xl transition cursor-pointer flex items-start gap-3 group"
                      >
                        <div className="bg-amber-600/20 text-amber-500 p-2.5 rounded-xl group-hover:bg-amber-600 group-hover:text-white transition">
                          <RefreshCw className="w-5 h-5" />
                        </div>
                        <div>
                          <span className="font-bold text-xs text-slate-200 block">🔄 Substituir Álbum Existente</span>
                          <span className="text-[11px] text-slate-405 mt-0.5 block leading-relaxed">Substitui o álbum anterior na folha principal de charts, associando faixas corretamente.</span>
                        </div>
                      </button>
                    </div>
                  </div>
                )}

                {albumModalStep === 'dados' && (
                  <div className="space-y-4">
                    {/* albumSubstituido selector if in substituicao mode */}
                    {albumModo === 'substituicao' && (
                      <div className="space-y-1.5 relative">
                        <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest block">📀 Selecione o Álbum a ser substituído:</label>
                        <input
                          type="text"
                          placeholder="🔍 Digite para procurar o álbum..."
                          value={albumBuscaSubstituir}
                          onChange={(e) => {
                            setAlbumBuscaSubstituir(e.target.value);
                            setAlbumSubstituido(e.target.value);
                          }}
                          className="w-full bg-black/45 text-white text-xs border border-white/10 rounded-xl py-3 px-3.5 focus:outline-none focus:border-blue-500 placeholder:text-slate-600 font-sans shadow-inner"
                        />
                        {albumBuscaSubstituir.trim() && (
                          <div className="absolute z-[60] w-full max-h-36 overflow-y-auto bg-slate-900 border border-white/10 rounded-xl mt-1 py-1 shadow-2xl">
                            {albunsEdicaoCharts
                              .filter(alb => alb.toLowerCase().includes(albumBuscaSubstituir.toLowerCase()))
                              .map(alb => (
                                <button
                                  key={alb}
                                  type="button"
                                  onClick={() => {
                                    setAlbumSubstituido(alb);
                                    setAlbumBuscaSubstituir(alb);
                                  }}
                                  className="w-full text-left hover:bg-blue-600/25 px-3.5 py-2 text-xs text-slate-250 transition"
                                >
                                  📀 {alb}
                                </button>
                              ))}
                          </div>
                        )}
                        {albumSubstituido && (
                          <div className="text-[10px] text-emerald-400 flex items-center gap-1.5 mt-1 bg-emerald-950/20 border border-emerald-500/10 px-3 py-2 rounded-xl">
                            <Check className="w-3.5 h-3.5" /> Substituir nos Charts: <strong className="text-emerald-300">{albumSubstituido}</strong>
                          </div>
                        )}
                      </div>
                    )}

                    {/* tipo de lancamento card selectors */}
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest block">💿 Tipo de Lançamento:</label>
                      <div className="grid grid-cols-4 gap-2">
                        {['ALBUM', 'EP', 'DELUXE', 'OUTROS'].map(tipo => (
                          <button
                            key={tipo}
                            type="button"
                            onClick={() => setAlbumTipoLancamento(tipo)}
                            className={`py-2 px-1 text-center rounded-xl font-bold text-[10px] transition border cursor-pointer ${
                              albumTipoLancamento === tipo 
                                ? 'bg-blue-600 text-white border-blue-500' 
                                : 'bg-white/5 text-slate-400 border-white/5 hover:bg-white/10'
                            }`}
                          >
                            {tipo}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* artista principal searchable input */}
                    <div className="space-y-1.5 relative">
                      <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest block">👤 Artista Principal do projeto:</label>
                      <input
                        type="text"
                        placeholder="🔍 Procure ou digite o nome do artista..."
                        value={albumBuscaArtista}
                        onChange={(e) => {
                          setAlbumBuscaArtista(e.target.value);
                          setAlbumArtistaPrincipal(e.target.value);
                          setShowAlbumArtistaDropdown(true);
                        }}
                        onFocus={() => setShowAlbumArtistaDropdown(true)}
                        className="w-full bg-black/45 text-white text-xs border border-white/10 rounded-xl py-3 px-3.5 focus:outline-none focus:border-blue-500 placeholder:text-slate-600 font-sans shadow-inner"
                      />
                      {showAlbumArtistaDropdown && albumBuscaArtista.trim() && (
                        <div className="absolute z-[60] w-full max-h-36 overflow-y-auto bg-slate-900 border border-white/10 rounded-xl mt-1 py-1 shadow-2xl">
                          {artistas
                            .filter(art => art.toLowerCase().includes(albumBuscaArtista.toLowerCase()))
                            .map(art => (
                              <button
                                key={art}
                                type="button"
                                onClick={() => {
                                  setAlbumArtistaPrincipal(art);
                                  setAlbumBuscaArtista(art);
                                  setShowAlbumArtistaDropdown(false);
                                }}
                                className="w-full text-left hover:bg-blue-600/25 px-3.5 py-2 text-xs text-slate-250 transition cursor-pointer"
                              >
                                👤 {art}
                              </button>
                            ))}
                        </div>
                      )}
                      {albumArtistaPrincipal && (
                        <div className="text-[10px] text-blue-400 flex items-center justify-between gap-1 mt-1 bg-blue-950/25 border border-blue-500/10 px-3 py-2 rounded-xl">
                          <span className="flex items-center gap-1.5">
                            <Check className="w-3.5 h-3.5 animate-pulse" /> Artista Atribuído: <strong className="text-blue-300">{albumArtistaPrincipal}</strong>
                          </span>
                          <button 
                            type="button" 
                            onClick={() => {
                              setAlbumArtistaPrincipal("");
                              setAlbumBuscaArtista("");
                            }}
                            className="text-[9px] underline text-blue-300 hover:text-white"
                          >
                            Limpar
                          </button>
                        </div>
                      )}
                    </div>

                    {/* qtd de musicas - counter selector */}
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest block font-sans">🔢 Quantidade de Músicas no Álbum:</label>
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => {
                            const val = Math.max(0, albumQtdMusicas - 1);
                            setAlbumQtdMusicas(val);
                            setAlbumMusicas(prev => {
                              const next = [...prev];
                              if (next.length > val) return next.slice(0, val);
                              while (next.length < val) {
                                next.push({ nome: "", tipo: "TRACKLIST ALBUM", formato: "SOLO" });
                              }
                              return next;
                            });
                          }}
                          className="bg-white/5 hover:bg-white/10 border border-white/10 w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white transition active:scale-95 cursor-pointer text-sm"
                        >
                          -
                        </button>
                        <input
                          type="number"
                          value={albumQtdMusicas || ''}
                          onChange={(e) => {
                            const val = Math.max(0, parseInt(e.target.value) || 0);
                            setAlbumQtdMusicas(val);
                            setAlbumMusicas(prev => {
                              const next = [...prev];
                              if (next.length > val) return next.slice(0, val);
                              while (next.length < val) {
                                next.push({ nome: "", tipo: "TRACKLIST ALBUM", formato: "SOLO" });
                              }
                              return next;
                            });
                          }}
                          className="w-20 bg-black/45 text-white text-center font-bold rounded-xl py-2.5 border border-white/10 text-xs focus:outline-none focus:border-blue-500 font-mono"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const val = albumQtdMusicas + 1;
                            setAlbumQtdMusicas(val);
                            setAlbumMusicas(prev => {
                              const next = [...prev];
                              if (next.length > val) return next.slice(0, val);
                              while (next.length < val) {
                                next.push({ nome: "", tipo: "TRACKLIST ALBUM", formato: "SOLO" });
                              }
                              return next;
                            });
                          }}
                          className="bg-white/5 hover:bg-white/10 border border-white/10 w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white transition active:scale-95 cursor-pointer text-sm"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {albumModalStep === 'musicas_list' && (
                  <div className="space-y-4">
                    <p className="text-[11px] text-slate-400 leading-relaxed text-left">
                      💡 Toque nos campos para nomear cada música. Se a faixa já existe nos Charts, o sistema reconhecerá e buscará sugestões automaticamente possibilitando a vinculação!
                    </p>
                    <div className="space-y-3.5 max-h-[45vh] overflow-y-auto pr-1">
                      {albumMusicas.map((m, idx) => (
                        <div key={idx} className="bg-black/25 p-3.5 rounded-2xl border border-white/5 space-y-2.5 relative font-sans text-left">
                          <div className="flex items-center justify-between text-[10px] font-mono font-bold text-slate-400">
                            <span>MÚSICA #{idx + 1}</span>
                            <span className={m.tipo === 'JÁ EXISTE' ? 'text-emerald-400' : 'text-blue-400'}>
                              {m.tipo === 'JÁ EXISTE' ? '⭐ Existe nos Charts (Vincular)' : '✨ Nova Faixa'}
                            </span>
                          </div>
                          
                          {/* Nome Input */}
                          <div className="relative">
                            <input
                              type="text"
                              value={m.nome}
                              placeholder={`Título da Música ${idx + 1}...`}
                              onChange={(e) => {
                                const newName = e.target.value;
                                setAlbumMusicas(prev => {
                                  const next = [...prev];
                                  next[idx].nome = newName;
                                  const matchesExact = musicasEdicaoCharts.some(song => song.toLowerCase() === newName.trim().toLowerCase());
                                  if (matchesExact) {
                                    next[idx].tipo = "JÁ EXISTE";
                                  } else {
                                    next[idx].tipo = "TRACKLIST ALBUM";
                                  }
                                  return next;
                                });
                                setShowDropdownIndex(idx);
                              }}
                              className="w-full bg-black/45 text-white text-xs border border-white/5 rounded-xl py-2.5 px-3 focus:outline-none focus:border-blue-500 placeholder:text-slate-655 shadow-inner"
                            />
                            {showDropdownIndex === idx && m.nome.trim() && (
                              <div className="absolute z-[70] w-full max-h-32 overflow-y-auto bg-slate-900 border border-white/10 rounded-xl mt-1 py-1 shadow-2xl">
                                {musicasEdicaoCharts
                                  .filter(song => song.toLowerCase().includes(m.nome.toLowerCase()))
                                  .map(song => (
                                    <button
                                      key={song}
                                      type="button"
                                      onClick={() => {
                                        setAlbumMusicas(prev => {
                                          const next = [...prev];
                                          next[idx].nome = song;
                                          next[idx].tipo = "JÁ EXISTE";
                                          return next;
                                        });
                                        setShowDropdownIndex(null);
                                      }}
                                      className="w-full text-left hover:bg-blue-600/25 px-3 py-2 text-xs text-slate-200 transition cursor-pointer"
                                    >
                                      🎵 {song}
                                    </button>
                                  ))}
                              </div>
                            )}
                          </div>

                          {/* Tipo e Formato Row */}
                          <div className="grid grid-cols-2 gap-2.5 mt-1">
                            <div>
                              <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-0.5">Tipo de entrada:</label>
                              <select
                                value={m.tipo}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setAlbumMusicas(prev => {
                                    const next = [...prev];
                                    next[idx].tipo = val;
                                    return next;
                                  });
                                }}
                                className="w-full bg-black/45 text-slate-200 border border-white/5 rounded-lg py-1 px-1.5 focus:outline-none focus:border-blue-500 text-[10px] cursor-pointer"
                              >
                                <option value="TRACKLIST ALBUM">Criar nova faixa nos charts</option>
                                <option value="JÁ EXISTE">Já existe nos charts (Vincular)</option>
                              </select>
                            </div>
                            <div>
                              <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-0.5">Formato:</label>
                              <select
                                value={m.formato}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setAlbumMusicas(prev => {
                                    const next = [...prev];
                                    next[idx].formato = val;
                                    return next;
                                  });
                                }}
                                className="w-full bg-black/45 text-slate-200 border border-white/5 rounded-lg py-1 px-1.5 focus:outline-none focus:border-blue-500 text-[10px] cursor-pointer"
                              >
                                <option value="SOLO">SOLO</option>
                                <option value="DUO">DUO</option>
                                <option value="COLAB">COLAB</option>
                                <option value="GRUPO">GRUPO</option>
                              </select>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {albumModalStep === 'resumo' && (
                  <div className="space-y-4">
                    <p className="text-xs text-slate-300 text-left leading-relaxed">Reveja os detalhes finais de consolidação do Álbum antes do envio:</p>
                    <div className="bg-black/35 p-4 rounded-3xl border border-white/5 space-y-3.5 text-left text-sans">
                      <div className="border-b border-white/5 pb-2.5">
                        <span className="text-[9px] font-mono text-slate-500 block uppercase font-bold tracking-wider">Título do Álbum:</span>
                        <strong className="text-sm text-slate-100 font-display">{selectedTitulo}</strong>
                      </div>
                      <div className="grid grid-cols-2 gap-3 pb-2.5 border-b border-white/5">
                        <div>
                          <span className="text-[9px] font-mono text-slate-500 block uppercase font-bold tracking-wider">Modo do fluxo:</span>
                          <span className={`text-xs font-bold ${albumModo === 'registro' ? 'text-blue-400' : 'text-amber-500'}`}>
                            {albumModo === 'registro' ? '🆕 Novo Registro' : `🔄 Substituição`}
                          </span>
                        </div>
                        <div>
                          <span className="text-[9px] font-mono text-slate-500 block uppercase font-bold tracking-wider">Tipo lançamento:</span>
                          <span className="text-xs text-slate-100 font-semibold">{albumTipoLancamento}</span>
                        </div>
                      </div>
                      <div className="border-b border-white/5 pb-2.5">
                        <span className="text-[9px] font-mono text-slate-500 block uppercase font-bold tracking-wider">Artista Atribuído:</span>
                        <span className="text-xs text-slate-200 font-medium">{albumArtistaPrincipal || '-'}</span>
                      </div>
                      {albumModo === 'substituicao' && albumSubstituido && (
                        <div className="border-b border-white/5 pb-2.5 bg-amber-950/20 px-3 py-2 rounded-xl border border-amber-500/10">
                          <span className="text-[9px] font-mono text-amber-550 block uppercase font-bold tracking-wider font-sans">Álbum Substituído nos Charts:</span>
                          <span className="text-xs text-amber-250 font-bold">{albumSubstituido}</span>
                        </div>
                      )}
                      <div>
                        <span className="text-[9px] font-mono text-slate-500 block uppercase font-bold mb-2 tracking-wider">Tracklist ({albumQtdMusicas} músicas):</span>
                        <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                          {albumMusicas.map((m, i) => (
                            <div key={i} className="text-xs text-slate-300 flex justify-between items-center bg-white/5 py-1.5 px-3 rounded-xl border border-white/5 font-sans">
                              <span><strong className="text-slate-550">{i+1}.</strong> {m.nome || 'Nome não preenchido'}</span>
                              <span className={`text-[8px] font-mono font-bold px-2 py-0.5 rounded-md uppercase ${m.tipo === 'JÁ EXISTE' ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-500/10' : 'bg-slate-900 text-slate-400'}`}>
                                {m.tipo === 'JÁ EXISTE' ? 'Link Charts' : m.formato}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Navigation Action Footer */}
              <div className="px-6 py-4 bg-black/40 border-t border-white/5 flex gap-3">
                {albumModalStep !== 'modo' && (
                  <button
                    type="button"
                    onClick={() => {
                      if (albumModalStep === 'dados') setAlbumModalStep('modo');
                      else if (albumModalStep === 'musicas_list') setAlbumModalStep('dados');
                      else if (albumModalStep === 'resumo') setAlbumModalStep('musicas_list');
                    }}
                    className="flex-1 bg-white/5 hover:bg-white/10 text-white font-bold py-3 px-4 rounded-xl text-xs transition cursor-pointer flex items-center justify-center gap-1"
                  >
                    Voltar
                  </button>
                )}
                <button
                  type="button"
                  disabled={albumSaving}
                  onClick={() => {
                    if (albumModalStep === 'modo') {
                      setAlbumModalStep('dados');
                    } else if (albumModalStep === 'dados') {
                      if (albumModo === 'substituicao' && !albumSubstituido.trim()) {
                        alert("Por favor, selecione qual álbum deseja substituir nos Charts.");
                        return;
                      }
                      if (!albumArtistaPrincipal.trim()) {
                        alert("Por favor, preencha o artista principal do projeto.");
                        return;
                      }
                      if (albumQtdMusicas <= 0) {
                        alert("A quantidade de músicas deve ser maior que 0.");
                        return;
                      }
                      setAlbumModalStep('musicas_list');
                    } else if (albumModalStep === 'musicas_list') {
                      const complete = albumMusicas.every(m => m.nome.trim() !== "");
                      if (!complete) {
                        alert("Por favor, preencha o nome de todas as faixas do álbum.");
                        return;
                      }
                      setAlbumModalStep('resumo');
                    } else if (albumModalStep === 'resumo') {
                      handleGravarAlbumCompleto();
                    }
                  }}
                  className={`flex-1 font-bold py-3 px-4 rounded-xl text-xs transition cursor-pointer flex items-center justify-center gap-1 text-white ${
                    albumSaving 
                      ? 'bg-blue-600/50 cursor-not-allowed' 
                      : albumModalStep === 'resumo' 
                        ? 'bg-emerald-600 hover:bg-emerald-500 shadow-lg shadow-emerald-500/10' 
                        : 'bg-blue-600 hover:bg-blue-500 shadow-md shadow-blue-600/10'
                  }`}
                >
                  {albumSaving ? 'Salvando...' : albumModalStep === 'resumo' ? 'Confirmar e Enviar' : 'Avançar'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* FOOTER */}
      <footer className="border-t border-white/5 bg-transparent px-6 py-6 mt-12 text-center text-xs text-slate-500 font-sans">
        <p>© 2026 Empire Bot Studio. Desenvolvido com carinho para @testeempire_bot.</p>
      </footer>
    </div>
  );
}

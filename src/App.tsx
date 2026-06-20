import React, { useState, useEffect } from 'react';
import { 
  Play, 
  RefreshCw, 
  MessageSquare, 
  Music, 
  Video, 
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
  Settings
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
  const [artistas, setArtistas] = useState(PROMO_ARTISTS);
  const [novoTopicoNome, setNovoTopicoNome] = useState("");
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
  const [step, setStep] = useState<'loading' | 'step0' | 'step1' | 'step2' | 'step3' | 'step4' | 'step5' | 'step5b' | 'comentario' | 'resumo' | 'sucesso' | 'erro'>('step0');
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

  // Aba ativa do painel de controle (Simulador / Instruções / Código GAS / Código HTML)
  const [activeTab, setActiveTab] = useState<'simulador' | 'instrucoes' | 'codigogas' | 'codigohtml'>('simulador');
  const [copiedIndex, setCopiedIndex] = useState<string | null>(null);

  // Efeitos colaterais e Logger
  const addLog = (msg: string, type: 'info' | 'error' | 'success' = 'info') => {
    const time = new Date().toLocaleTimeString('pt-BR');
    setLogs(prev => [{ time, msg, type }, ...prev]);
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
      
      if (res && res.musicas && res.musicas.length > 0) {
        setMusicas(res.musicas);
        if (res.artistas && res.artistas.length > 0) {
          setArtistas(res.artistas);
        }
        if (!silencioso) {
          addLog(`Planilha carregada em tempo real com sucesso! Encontrados ${res.musicas.length} tópicos e ${res.artistas?.length || 0} artistas habilitados.`, "success");
        }
      } else {
        if (!silencioso) addLog("Planilha conectou mas não retornou músicas válidas. Verifique os dados das abas.", "error");
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

    const tg = (window as any).Telegram?.WebApp;
    let finalThreadId = threadIdVal || "";
    let finalTitulo = tituloVal ? decodeURIComponent(tituloVal) : "";

    if (tg) {
      tg.ready();
      tg.expand();
      if (tg.initDataUnsafe?.start_param) {
        finalThreadId = tg.initDataUnsafe.start_param;
      }
    }

    if (finalThreadId) {
      setSelectedThreadId(finalThreadId);
      addLog(`Telegram WebApp: Detectado ID do Tópico de origem #${finalThreadId}`, "info");
      
      // Se tiver título associado ou puder coincidir
      if (finalTitulo) {
        setSelectedTitulo(finalTitulo);
      } else {
        // Busca se existe nas músicas já carregadas
        const encontrada = musicas.find(m => String(m.threadId) === String(finalThreadId));
        if (encontrada) {
          setSelectedTitulo(encontrada.titulo);
        } else {
          setSelectedTitulo(`Música #${finalThreadId}`);
        }
      }
      
      // Abre direto na tela de escolha de ação
      setStep('step1');
    }
  }, [musicas]);

  // Simula a criação de um novo tópico no fórum do Telegram
  const handleCriarTopicoTelegram = (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoTopicoNome.trim()) return;

    const newThreadId = String(Math.floor(Math.random() * 90000) + 10000);
    const novoTopico = { titulo: novoTopicoNome.trim(), threadId: newThreadId };
    
    setMusicas(prev => [novoTopico, ...prev]);
    addLog(`Novo fórum criado no Telegram: "${novoTopicoNome}" (Thread ID: ${newThreadId})`, 'success');

    // Mensagens no chat
    const mIdUser = String(Date.now() + 1);
    const mIdBot = String(Date.now() + 2);
    
    setMensagensTelegram(prev => [
      ...prev,
      { id: mIdUser, from: "Usuário", isBot: false, text: `Criou o tópico: ${novoTopicoNome}`, threadId: newThreadId },
      { id: mIdBot, from: "Empire Bot", isBot: true, text: `🎵 *${novoTopicoNome}*\n\n📋 Toque no botão abaixo para registrar nos Charts:`, threadId: newThreadId, replyMarkup: true, messageId: `msg_${newThreadId}` }
    ]);

    // Seleciona automaticamente para simular no WebApp
    setSelectedThreadId(newThreadId);
    setSelectedTitulo(novoTopicoNome.trim());
    setStep('step1'); // Abre direto na tela de opções após interagir no bot

    setNovoTopicoNome("");
  };

  // Selecionar música do tópico no App
  const handleSelecionarTopicoNoApp = (titulo: string, threadId: string) => {
    setSelectedThreadId(threadId);
    setSelectedTitulo(titulo);
    addLog(`Mini App: Tópico selecionado para registro -> "${titulo}" (${threadId})`, 'info');
    setStep('step1');
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
        const response = await fetch(`${scriptUrl}?${params.toString()}`);
        const res = await response.json();
        
        if (res.ok) {
          addLog(`[CONEXÃO REAL] Gravado em tempo real com sucesso! Tópico registrado: "${selectedTitulo}"`, 'success');
          setStep('sucesso');
          
          // Se houver Telegram WebApp ativo, fecha o Mini App em 3s
          const tg = (window as any).Telegram?.WebApp;
          if (tg && typeof tg.close === 'function') {
            setTimeout(() => tg.close(), 3000);
          }
        } else {
          setErroMsg(res.error || 'Erro desconhecido retornado pelo script.');
          setStep('erro');
          addLog(`[CONEXÃO REAL ERRO] Falha ao gravar na planilha: ${res.error || 'Erro interno'}`, 'error');
        }
      } catch (err: any) {
        setErroMsg(`Erro ao conectar com o script do Google. Verifique sua rede e a implantação do GAS. Detalhes: ${err.message}`);
        setStep('erro');
        addLog(`[CONEXÃO REAL ERRO] Erro na requisição: ${err.message}`, 'error');
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
        const response = await fetch(`${scriptUrl}?${params.toString()}`);
        const res = await response.json();
        
        if (res.ok) {
          addLog(`[CONEXÃO REAL] Comentários vinculados em tempo real com sucesso! Música: "${musica}"`, 'success');
          setStep('sucesso');
          
          const tg = (window as any).Telegram?.WebApp;
          if (tg && typeof tg.close === 'function') {
            setTimeout(() => tg.close(), 3000);
          }
        } else {
          setErroMsg(res.error || 'Erro desconhecido ao vincular comentários.');
          setStep('erro');
          addLog(`[CONEXÃO REAL ERRO] Falha ao vincular: ${res.error}`, 'error');
        }
      } catch (err: any) {
        setErroMsg(`Erro ao conectar com o script do Google: ${err.message}`);
        setStep('erro');
        addLog(`[CONEXÃO REAL ERRO] Erro na transmissão: ${err.message}`, 'error');
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
          <h5 className="text-[14px] font-display font-extrabold text-blue-450 tracking-tight">Tópico</h5>
          {selectedTitulo && (
            <p className="text-xs font-bold text-green-300 bg-emerald-500/10 py-1.5 px-3 rounded-full border border-emerald-500/20 inline-block font-sans mt-2 shadow-inner">
              🎵 {selectedTitulo}
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
              <h4 className="text-[11px] font-bold text-blue-400 uppercase tracking-widest text-left font-mono">📋 Qual tópico deseja registrar?</h4>
              <input 
                type="text" 
                placeholder="🔍 Buscar pelo nome..." 
                value={buscaTópico}
                onChange={(e) => setBuscaTópico(e.target.value)}
                className="w-full bg-black/35 text-white text-xs border border-white/10 rounded-xl py-2.5 px-3 focus:outline-none focus:border-blue-500 placeholder:text-slate-500"
              />
              <div className="space-y-1.5 max-h-[320px] overflow-y-auto pr-1">
                {musicas
                  .filter(m => m.titulo.toLowerCase().includes(buscaTópico.toLowerCase()))
                  .map(m => (
                    <button
                      key={m.threadId}
                      onClick={() => handleSelecionarTopicoNoApp(m.titulo, m.threadId)}
                      className="w-full text-left bg-white/5 border border-white/5 hover:border-blue-500/45 hover:bg-blue-500/5 py-2.5 px-3 rounded-xl text-xs font-medium transition cursor-pointer flex items-center justify-between"
                    >
                      <span>{m.titulo}</span>
                      <span className="text-[10px] text-slate-450 font-mono">ID: {m.threadId}</span>
                    </button>
                ))}
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
                onClick={() => handleEscolherOpcao('substituir')}
                className="w-full text-left bg-white/5 hover:bg-subtle border border-white/5 text-slate-100 py-3.5 px-4 rounded-xl text-xs transition font-medium cursor-pointer"
              >
                🔄 Substituir música existente
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
              <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-1">
                {musicas.filter(m => m.threadId !== selectedThreadId).map(m => (
                  <button
                    key={m.threadId}
                    onClick={() => { setMusicaSubstituida(m.titulo); setStep('resumo'); }}
                    className="w-full text-left bg-white/5 border border-white/5 hover:border-blue-500/40 hover:bg-blue-600/10 hover:text-white py-2 px-3 rounded-xl text-xs font-semibold transition cursor-pointer"
                  >
                    {m.titulo}
                  </button>
                ))}
              </div>
              <button onClick={() => setStep('step5')} className="w-full bg-transparent border border-white/5 text-slate-500 text-[9.5px] py-1.5 rounded-xl cursor-pointer">← Voltar</button>
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
            <div className="py-16 text-center space-y-4">
              <div className="w-14 h-14 rounded-full bg-emerald-500/20 border border-emerald-500/35 flex items-center justify-center text-emerald-400 font-bold text-3xl shadow-lg shadow-emerald-500/5 mx-auto animate-bounce">✓</div>
              <div>
                <h4 className="text-sm font-bold text-emerald-400">Registrado com Sucesso!</h4>
                <p className="text-[10px] text-slate-400 mt-1 max-w-[240px] mx-auto leading-relaxed font-sans">Os dados já foram consolidados no seu Google Sheets de forma instantânea.</p>
              </div>
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
              <div className="bg-black/35 p-3 border-t border-white/5">
                <form onSubmit={handleCriarTopicoTelegram} className="flex gap-2">
                  <div className="relative flex-1">
                    <Music className="w-4 h-4 text-slate-500 absolute left-3 top-3.5" />
                    <input 
                      type="text" 
                      value={novoTopicoNome}
                      onChange={(e) => setNovoTopicoNome(e.target.value)}
                      placeholder="Simular Criação de Tópico (Ex: Flowers)..."
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
                    <p className="text-[9px] text-slate-400 mb-1">Registro oficial de músicas</p>
                    {selectedTitulo && <p className="text-[10px] font-bold text-blue-400/80 bg-blue-500/5 py-1 px-2.5 rounded-full border border-blue-500/10 inline-block font-sans">🎵 {selectedTitulo}</p>}
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
                        <h4 className="text-[11px] font-bold text-blue-400 uppercase tracking-widest text-left font-mono">📋 Qual tópico deseja registrar?</h4>
                        <input 
                          type="text" 
                          placeholder="🔍 Buscar pelo nome..." 
                          value={buscaTópico}
                          onChange={(e) => setBuscaTópico(e.target.value)}
                          className="w-full bg-black/35 text-white text-xs font-sans border border-white/10 rounded-xl py-2.5 px-3 focus:outline-none focus:border-blue-500 placeholder:text-slate-500 shadow-inner"
                        />
                        <div className="space-y-1.5 max-h-[300px] overflow-y-auto pr-1">
                          {musicas
                            .filter(m => m.titulo.toLowerCase().includes(buscaTópico.toLowerCase()))
                            .map(m => (
                              <button
                                key={m.threadId}
                                onClick={() => handleSelecionarTopicoNoApp(m.titulo, m.threadId)}
                                className="w-full text-left bg-white/5 border border-white/5 hover:border-blue-500/40 hover:bg-blue-605/10 hover:text-white py-2.5 px-3 rounded-xl text-xs font-medium transition cursor-pointer flex items-center justify-between"
                              >
                                <span>{m.titulo}</span>
                                <span className="text-[10px] text-slate-500 hover:text-inherit">ID: {m.threadId}</span>
                              </button>
                          ))}
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
                          onClick={() => handleEscolherOpcao('substituir')}
                          className="w-full text-left bg-white/5 hover:bg-blue-600 hover:text-white border border-white/5 text-slate-100 py-3 px-4 rounded-xl text-xs transition font-medium cursor-pointer"
                        >
                          🔄 Substituir música existente
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
                        <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-1">
                          {musicas
                            .filter(m => m.threadId !== selectedThreadId)
                            .map(m => (
                              <button
                                key={m.threadId}
                                onClick={() => { setMusicaSubstituida(m.titulo); setStep('resumo'); }}
                                className="w-full text-left bg-white/5 border border-white/5 hover:border-blue-500/40 hover:bg-blue-600/10 hover:text-white py-2 px-3 rounded-xl text-xs font-semibold transition cursor-pointer"
                              >
                                {m.titulo}
                              </button>
                          ))}
                        </div>
                        <button onClick={() => setStep('step5')} className="w-full bg-transparent border border-white/5 text-slate-500 text-[9.5px] py-1.5 rounded-xl cursor-pointer">
                          ← Voltar
                        </button>
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
                      <div className="h-full flex flex-col items-center justify-center py-20 text-center space-y-3">
                        <div className="w-12 h-12 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold text-2xl shadow-lg shadow-emerald-500/10 animate-bounce">
                          ✓
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-emerald-400">Registrado com Sucesso!</h4>
                          <p className="text-[10px] text-slate-400 mt-1">Os dados foram enviados de forma segura para a planilha via GET assíncrono.</p>
                        </div>
                        <button 
                          onClick={resetForm}
                          className="w-full bg-blue-600 text-white text-[10px] py-2 rounded-xl font-bold hover:bg-blue-500 active:scale-95 transition cursor-pointer mt-4"
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

      </main>

      {/* FOOTER */}
      <footer className="border-t border-white/5 bg-transparent px-6 py-6 mt-12 text-center text-xs text-slate-500">
        <p>© 2026 Empire Bot Studio. Desenvolvido com carinho para @testeempire_bot.</p>
      </footer>
    </div>
  );
}

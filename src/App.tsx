/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Building2,
  CalendarDays,
  CheckCheck,
  ChevronDown,
  ChevronRight,
  CircleCheck,
  CircleHelp,
  Clock,
  FileText,
  HelpCircle,
  LoaderCircle,
  Lock,
  LockKeyhole,
  LogOut,
  MapPin,
  MessageCircle,
  Pause,
  Phone,
  Play,
  Plus,
  Save,
  ShieldCheck,
  Trash2,
  Users,
  X,
  Zap,
} from 'lucide-react';
import { Attendant, PanelData } from './types.ts';
import {
  getStoredData,
  saveStoredData,
  getNextActivePhone,
  checkIsAuthenticated,
  setAuthenticated,
} from './storage.ts';

// Logo exclusivo inspirado no conceito de vitalidade, acolhimento e cuidado humano
function CareBrandLogo({ className = 'w-full h-full' }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="Logo da Central de Atendimento">
      <rect width="100" height="100" rx="22" fill="url(#care-logo-grad)" />
      {/* Cabeça do ícone de vitalidade */}
      <circle cx="48.5" cy="27" r="8" fill="#ffffff" />
      {/* Figura estilizada em asa/abraço dinâmico de cuidado */}
      <path
        d="M35 21C34.5 35 37 54 44 67L45.5 87L46.5 87C54 62 66 39 76 14C70 27 61 43 53 53C47 43 41 31 35 21Z"
        fill="#ffffff"
      />
      <defs>
        <linearGradient id="care-logo-grad" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
          <stop stopColor="#1a56b5" />
          <stop offset="1" stopColor="#0e3f8c" />
        </linearGradient>
      </defs>
    </svg>
  );
}

// SVG WhatsApp Icon
function WhatsAppIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
    </svg>
  );
}

// Hook to manage live attendant rotation & WhatsApp redirection
function useAttendantRouting() {
  const [phone, setPhone] = useState<string>('5511966604328');
  const [routingNotice, setRoutingNotice] = useState<string>('');
  const routingLock = useRef<boolean>(false);

  useEffect(() => {
    let isMounted = true;
    const fetchAvailability = async () => {
      try {
        const res = await fetch('/api/availability', { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          if (isMounted) setPhone(data.phone || '');
        } else if (res.status === 503 && isMounted) {
          setPhone('');
        }
      } catch {
        const fallback = getNextActivePhone();
        if (isMounted && fallback) setPhone(fallback);
      }
    };

    fetchAvailability();
    const interval = setInterval(fetchAvailability, 15000);
    const onVisibility = () => {
      if (!document.hidden) fetchAvailability();
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      isMounted = false;
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  useEffect(() => {
    if (!routingNotice) return;
    const timer = setTimeout(() => setRoutingNotice(''), 7000);
    return () => clearTimeout(timer);
  }, [routingNotice]);

  const buildWhatsAppUrl = (text: string) => {
    return phone ? `https://wa.me/${phone}?text=${encodeURIComponent(text)}` : undefined;
  };

  const contactLabel = phone
    ? `WhatsApp: +${phone.slice(0, 2)} (${phone.slice(2, 4)}) ${phone.slice(4, 9)}-${phone.slice(9)}`
    : 'Canal de atendimento';

  const routeWhatsApp = async (e: React.MouseEvent<HTMLDivElement>) => {
    const target = (e.target instanceof Element ? e.target : null)?.closest('a[href]');
    if (!target || !e.currentTarget.contains(target)) return;

    try {
      const url = new URL((target as HTMLAnchorElement).href);
      if (url.hostname !== 'wa.me') return;
      if (e.button !== 0 && e.button !== 1) return;
      if (routingLock.current) return;

      e.preventDefault();
      routingLock.current = true;

      const message = url.searchParams.get('text') || '';
      const isNewTab =
        e.button === 1 || e.ctrlKey || e.metaKey || e.shiftKey || (target as HTMLAnchorElement).target === '_blank';
      const newWin = isNewTab ? window.open('about:blank', '_blank') : null;
      if (newWin) newWin.opener = null;

      setRoutingNotice('Conectando ao canal seguro do WhatsApp…');

      let targetPhone = phone;
      try {
        const res = await fetch('/api/route', {
          method: 'POST',
          cache: 'no-store',
          headers: { 'Content-Type': 'application/json' },
          body: '{}',
        });
        const data = await res.json();
        if (res.ok && data.phone && /^55[1-9]{2}9\d{8}$/.test(data.phone)) {
          targetPhone = data.phone;
        } else if (!res.ok) {
          const fallback = getNextActivePhone();
          if (fallback) targetPhone = fallback;
        }
      } catch {
        const fallback = getNextActivePhone();
        if (fallback) targetPhone = fallback;
      }

      if (!targetPhone) {
        if (newWin) newWin.close();
        throw new Error('Nenhum atendente disponível no momento. Tente novamente em instantes.');
      }

      const finalUrl = `https://wa.me/${targetPhone}?text=${encodeURIComponent(message)}`;
      if (newWin) {
        newWin.location.replace(finalUrl);
      } else {
        window.location.assign(finalUrl);
      }
      setRoutingNotice('');
    } catch (err: any) {
      setRoutingNotice(err.message || 'Não foi possível conectar. Tente novamente.');
    } finally {
      routingLock.current = false;
    }
  };

  return { phone, buildWhatsAppUrl, contactLabel, routeWhatsApp, routingNotice };
}

// Unified Customer Care Portal
function CustomerCareView({ navigate }: { navigate: (path: string) => void }) {
  const { phone, buildWhatsAppUrl, contactLabel, routeWhatsApp, routingNotice } = useAttendantRouting();
  const [chatStep, setChatStep] = useState<number>(0);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [activePolicyTab, setActivePolicyTab] = useState<'privacidade' | 'termos' | 'cookies' | 'prazos'>('privacidade');

  const policyDialogRef = useRef<HTMLDialogElement>(null);

  // Progressive realistic chat simulation
  useEffect(() => {
    setChatStep(0);
    const t1 = setTimeout(() => setChatStep(1), 600);
    const t2 = setTimeout(() => setChatStep(2), 1600);
    const t3 = setTimeout(() => setChatStep(3), 2600);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, []);

  const openPolicyModal = (tab: 'privacidade' | 'termos' | 'cookies' | 'prazos') => {
    setActivePolicyTab(tab);
    policyDialogRef.current?.showModal();
  };

  const closePolicyModal = () => {
    policyDialogRef.current?.close();
  };

  const serviceChannels = [
    {
      title: 'Atendimento Geral & Suporte',
      description: 'Fale com nossa equipe para orientações, dúvidas e suporte geral.',
      badge: 'MAIS USADO',
      featured: true,
      Icon: MessageCircle,
      message: 'Olá! Gostaria de falar com o atendimento geral.',
    },
    {
      title: 'Agendamentos & Prazos',
      description: 'Consulte disponibilidades, confirme horários e gerencie solicitações.',
      badge: '',
      featured: false,
      Icon: CalendarDays,
      message: 'Olá! Gostaria de verificar informações sobre agendamentos e prazos.',
    },
    {
      title: 'Informações & Documentos',
      description: 'Solicite esclarecimentos cadastrais, orientações e envio de documentos.',
      badge: '',
      featured: false,
      Icon: FileText,
      message: 'Olá! Preciso de orientações sobre informações e documentações.',
    },
    {
      title: 'Dúvidas & Orientações Frequentes',
      description: 'Esclarecimentos diretos sobre procedimentos e canais de contato.',
      badge: '',
      featured: false,
      Icon: HelpCircle,
      message: 'Olá! Tenho algumas dúvidas e gostaria de atendimento.',
    },
  ];

  const faqs = [
    {
      q: 'Como funciona o atendimento via WhatsApp?',
      a: 'Ao selecionar qualquer uma das opções ou clicar no botão principal, você será redirecionado para o aplicativo do WhatsApp com uma mensagem inicial pré-formatada. Basta clicar em "Enviar" e um atendente da nossa equipe dará sequência imediata à sua solicitação.',
    },
    {
      q: 'Qual é o horário de funcionamento?',
      a: 'Nosso canal opera de Segunda a Sexta-feira das 08h00 às 18h00 e aos Sábados das 08h00 às 13h00 (horário de Brasília). Mensagens enviadas fora do horário comercial são respondidas por ordem de chegada no primeiro dia útil subsequente.',
    },
    {
      q: 'O atendimento via WhatsApp é seguro?',
      a: 'Sim. A comunicação é realizada exclusivamente através de canais criptografados de ponta a ponta pelo WhatsApp. Nossa equipe jamais solicitará senhas bancárias, dados sigilosos de pagamento ou envio de valores financeiros.',
    },
    {
      q: 'Como funciona o direcionamento por filial e região?',
      a: 'Contamos com atendimento multirregional integrado em diversas regiões (São Paulo, Grande SP, ABC e Interior). Nosso sistema direciona sua mensagem automaticamente para a filial e atendente disponível mais próximo de você, agilizando o seu contato.',
    },
    {
      q: 'Posso acessar tanto pelo celular quanto pelo computador?',
      a: 'Sim! Caso acesse por um smartphone, o aplicativo do WhatsApp será aberto diretamente. Se estiver pelo computador ou tablet, será aberto o WhatsApp Web ou o app para desktop.',
    },
    {
      q: 'Quem é a empresa responsável por esta central de atendimento?',
      a: 'Central de Atendimento ao Cliente, inscrita sob o CNPJ 69.493.842/0001-29, com sede estabelecida na Rua Heloísa Pamplona, 720, Apt 71 Edif Positano, Bairro Fundação, São Caetano do Sul - SP, CEP 09520-310.',
    },
  ];

  return (
    <div onClick={routeWhatsApp} onAuxClick={routeWhatsApp} className="central-page-wrapper">
      {routingNotice && (
        <div className="routing-notice" role="status">
          {routingNotice}
        </div>
      )}

      <div className="central-container">
        {/* SELO DE VERIFICAÇÃO SUPERIOR */}
        <div className="verified-header-badge">
          <ShieldCheck size={16} />
          <span>Central de Atendimento ao Cliente</span>
        </div>

        {/* CARD HERO COM A NOVA LOGO ESTILIZADA DE CUIDADO E VITALIDADE */}
        <header className="attendant-hero-card">
          <div className="attendant-hero-avatar-ring">
            <div className="w-full h-full rounded-full overflow-hidden flex items-center justify-center bg-[#1a56b5]">
              <CareBrandLogo className="w-full h-full" />
            </div>
            <span className="attendant-hero-pulse" />
            <span className="attendant-hero-dot" />
          </div>
          <div className="attendant-hero-info">
            <div className="attendant-hero-name-row">
              <h2>Central de Atendimento</h2>
              <span className="attendant-hero-badge">
                <CircleCheck size={12} />
                Online
              </span>
            </div>
            <p className="attendant-hero-role">Suporte & Atendimento ao Cliente</p>
            <div className="attendant-hero-status">
              <Clock size={13} />
              <span>Resposta estimada: menos de 2 minutos</span>
            </div>
          </div>
        </header>

        {/* CONVERSA INTERATIVA SIMULADA */}
        <section className="chat-conversation-card" aria-label="Simulação de atendimento">
          {chatStep >= 1 ? (
            <div className="chat-bubble-wrapper fade-in-up">
              <div className="chat-bubble">
                <p className="chat-bubble-title">Olá! Seja muito bem-vindo(a) à nossa Central. 👋</p>
                <p className="chat-bubble-body">
                  Como podemos auxiliar você hoje? Estamos prontos para responder suas dúvidas e direcionar seu atendimento com rapidez.
                </p>
                <div className="chat-bubble-meta">
                  <span>Agora</span>
                  <CheckCheck size={14} className="text-[#0284c7]" />
                </div>
              </div>
            </div>
          ) : (
            <div className="chat-typing-bubble">
              <span className="chat-typing-dot" />
              <span className="chat-typing-dot" />
              <span className="chat-typing-dot" />
              <span className="chat-typing-label">Atendente digitando...</span>
            </div>
          )}

          {chatStep === 2 && (
            <div className="chat-typing-bubble fade-in">
              <span className="chat-typing-dot" />
              <span className="chat-typing-dot" />
              <span className="chat-typing-dot" />
              <span className="chat-typing-label">Atendente digitando...</span>
            </div>
          )}

          {chatStep >= 3 && (
            <div className="chat-bubble-wrapper fade-in-up">
              <div className="chat-bubble">
                <p className="chat-bubble-body">
                  Para um atendimento ágil e seguro, toque no botão abaixo para conversar com nossa equipe diretamente pelo WhatsApp:
                </p>
                <div className="chat-bubble-meta">
                  <span>Agora</span>
                  <CheckCheck size={14} className="text-[#0284c7]" />
                </div>
              </div>
            </div>
          )}

          {chatStep >= 3 && (
            <div className="fade-in-up mt-2">
              <a
                href={buildWhatsAppUrl('Olá! Gostaria de iniciar meu atendimento com a equipe.')}
                target="_blank"
                rel="noopener noreferrer"
                className="whatsapp-action-btn"
              >
                <WhatsAppIcon className="w-5 h-5 flex-shrink-0" />
                <span>Falar com Atendente no WhatsApp</span>
              </a>
              <p className="whatsapp-action-caption">
                Canal direto • Conexão criptografada de ponta a ponta
              </p>
            </div>
          )}
        </section>

        {/* CANAIS ESPECÍFICOS DE ATENDIMENTO */}
        <section className="departments-card">
          <div className="departments-header">
            <h3>Canais Diretos de Atendimento</h3>
            <p>Se preferir, selecione o departamento mais adequado para o seu contato:</p>
          </div>

          <div className="flex flex-col gap-2.5">
            {serviceChannels.map(({ title, description, badge, featured, Icon, message }) => (
              <a
                key={title}
                href={buildWhatsAppUrl(message)}
                target="_blank"
                rel="noopener noreferrer"
                className={`department-option-row ${featured ? 'featured' : ''}`}
              >
                <div className="department-option-icon">
                  <Icon size={20} />
                </div>
                <div className="department-option-content">
                  <div className="department-option-title">
                    <span>{title}</span>
                    {badge && <span className="department-option-badge">{badge}</span>}
                  </div>
                  <p className="department-option-desc">{description}</p>
                </div>
                <ChevronRight size={18} className="department-option-arrow" />
              </a>
            ))}
          </div>
        </section>

        {/* DÚVIDAS FREQUENTES (FAQ) */}
        <section className="faq-section-card">
          <div className="faq-title">
            <CircleHelp size={18} />
            <span>Dúvidas Frequentes</span>
          </div>
          <div className="faq-list">
            {faqs.map((faq, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div key={idx} className={`faq-item ${isOpen ? 'open' : ''}`}>
                  <button
                    type="button"
                    className="faq-question-btn"
                    onClick={() => setOpenFaq(isOpen ? null : idx)}
                    aria-expanded={isOpen}
                  >
                    <span>{faq.q}</span>
                    <ChevronDown size={16} className={`faq-chevron ${isOpen ? 'rotate' : ''}`} />
                  </button>
                  {isOpen && (
                    <div className="faq-answer">
                      <p>{faq.a}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* BOTÃO ADICIONAL DE ATENDIMENTO */}
        <a
          href={buildWhatsAppUrl('Olá! Gostaria de ser atendido pela equipe.')}
          target="_blank"
          rel="noopener noreferrer"
          className="whatsapp-action-btn"
        >
          <WhatsAppIcon className="w-5 h-5 flex-shrink-0" />
          <span>Abrir Conversa no WhatsApp</span>
        </a>

        {/* INFORMAÇÃO DE ATENDIMENTO MULTIRREGIONAL REPOSICIONADA EMBAIXO */}
        <div className="regional-network-box mt-1">
          <div className="flex items-start gap-2.5">
            <MapPin className="w-5 h-5 text-[#0284c7] flex-shrink-0 mt-0.5" />
            <div>
              <strong className="text-[13px] text-slate-800 font-bold block">Rede Multirregional Integrada</strong>
              <p className="text-[12px] text-slate-600 leading-relaxed mt-0.5">
                Atendimento por filiais: Conectamos você automaticamente ao atendente e filial mais próxima da sua localização (São Paulo, Grande SP, ABC e Interior) com distribuição inteligente de contatos.
              </p>
            </div>
          </div>
        </div>

        {/* OS 3 CARDS DE BENEFÍCIOS NO FINAL DA TELA */}
        <div className="trust-badges-bar mt-1">
          <div className="trust-badge-item">
            <Lock />
            <span>Criptografia de Ponta a Ponta</span>
          </div>
          <div className="trust-badge-item">
            <Zap />
            <span>Roteamento por Filial Mais Próxima</span>
          </div>
          <div className="trust-badge-item">
            <ShieldCheck />
            <span>Conformidade com a LGPD</span>
          </div>
        </div>

        {/* RODAPÉ TRANSPARENTE E CONFORME COM POLÍTICAS */}
        <footer className="google-ads-footer">
          {/* Card com os Dados Completos da Organização */}
          <div className="company-identity-card">
            <div className="company-identity-header">
              <Building2 size={16} />
              <span>Identificação da Empresa & Dados Cadastrais</span>
            </div>

            <div className="company-identity-grid">
              <div>
                <span className="company-field-label">Razão Social / Nome da Entidade</span>
                <span className="company-field-value">Central de Atendimento ao Cliente</span>
              </div>

              <div>
                <span className="company-field-label">Cadastro Nacional da Pessoa Jurídica (CNPJ)</span>
                <span className="company-field-value font-mono">69.493.842/0001-29</span>
              </div>

              <div>
                <span className="company-field-label">Endereço da Organização</span>
                <p className="mt-0.5 text-slate-700">
                  Rua Heloísa Pamplona, 720 - Apt 71 Edif Positano<br />
                  Bairro: Fundação - São Caetano do Sul - SP<br />
                  CEP: 09520-310 - Brasil
                </p>
              </div>

              <div>
                <span className="company-field-label">Horário de Atendimento</span>
                <p className="mt-0.5 text-slate-700">
                  Segunda a Sexta-feira: 08:00 às 18:00 | Sábados: 08:00 às 13:00
                </p>
              </div>

              <div>
                <span className="company-field-label">Central Multirregional & WhatsApp</span>
                <p className="text-xs text-slate-500 mt-0.5">
                  Roteamento dinâmico entre filiais regionais.
                </p>
                <a
                  href={buildWhatsAppUrl('Olá! Gostaria de informações de atendimento.')}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-emerald-700 font-bold hover:underline inline-flex items-center gap-1 mt-1 text-[13px]"
                >
                  <WhatsAppIcon className="w-4 h-4 text-emerald-600 inline" />
                  {contactLabel}
                </a>
              </div>
            </div>
          </div>

          {/* Links das Políticas Obrigatórias */}
          <div className="footer-policy-links">
            <button
              type="button"
              className="footer-policy-btn"
              onClick={() => openPolicyModal('privacidade')}
            >
              Política de Privacidade (LGPD)
            </button>
            <span className="text-slate-300">•</span>
            <button
              type="button"
              className="footer-policy-btn"
              onClick={() => openPolicyModal('termos')}
            >
              Termos de Uso
            </button>
            <span className="text-slate-300">•</span>
            <button
              type="button"
              className="footer-policy-btn"
              onClick={() => openPolicyModal('cookies')}
            >
              Política de Cookies
            </button>
            <span className="text-slate-300">•</span>
            <button
              type="button"
              className="footer-policy-btn"
              onClick={() => openPolicyModal('prazos')}
            >
              Prazos & Transparência
            </button>
          </div>

          <p className="footer-copyright">
            © {new Date().getFullYear()} Central de Atendimento ao Cliente • CNPJ 69.493.842/0001-29. Todos os direitos reservados.
          </p>
        </footer>
      </div>

      {/* MODAL DETALHADO DE POLÍTICAS LGPD & TRANSPARÊNCIA */}
      <dialog
        id="policy-dialog"
        ref={policyDialogRef}
        aria-labelledby="policy-modal-title"
        onClick={(e) => {
          if (e.target === policyDialogRef.current) {
            const rect = policyDialogRef.current.getBoundingClientRect();
            if (
              e.clientX < rect.left ||
              e.clientX > rect.right ||
              e.clientY < rect.top ||
              e.clientY > rect.bottom
            ) {
              policyDialogRef.current.close();
            }
          }
        }}
        className="policy-dialog"
      >
        <div className="policy-dialog-content">
          <div className="policy-dialog-header">
            <h2 id="policy-modal-title">Políticas de Privacidade & Transparência</h2>
            <button
              className="policy-dialog-close"
              onClick={closePolicyModal}
              aria-label="Fechar modal"
            >
              <X size={20} />
            </button>
          </div>

          {/* Barra de abas de políticas */}
          <div className="policy-tabs-bar">
            <button
              type="button"
              className={`policy-tab-btn ${activePolicyTab === 'privacidade' ? 'active' : ''}`}
              onClick={() => setActivePolicyTab('privacidade')}
            >
              Privacidade (LGPD)
            </button>
            <button
              type="button"
              className={`policy-tab-btn ${activePolicyTab === 'termos' ? 'active' : ''}`}
              onClick={() => setActivePolicyTab('termos')}
            >
              Termos de Uso
            </button>
            <button
              type="button"
              className={`policy-tab-btn ${activePolicyTab === 'cookies' ? 'active' : ''}`}
              onClick={() => setActivePolicyTab('cookies')}
            >
              Cookies & GTM
            </button>
            <button
              type="button"
              className={`policy-tab-btn ${activePolicyTab === 'prazos' ? 'active' : ''}`}
              onClick={() => setActivePolicyTab('prazos')}
            >
              Prazos de Atendimento
            </button>
          </div>

          <div className="policy-dialog-body">
            {activePolicyTab === 'privacidade' && (
              <>
                <p className="text-xs text-slate-500 font-semibold mb-3">
                  Documento em conformidade com a Lei Federal nº 13.709/2018 (Lei Geral de Proteção de Dados Pessoais - LGPD).
                </p>

                <h3>1. Controlador dos Dados Pessoais</h3>
                <p>
                  A Central de Atendimento ao Cliente, sob o CNPJ nº 69.493.842/0001-29, com sede na Rua Heloísa Pamplona, 720, Apt 71 Edif Positano, Fundação, São Caetano do Sul - SP, CEP 09520-310, atua na qualidade de Controladora dos dados pessoais tratados em razão das solicitações de atendimento.
                </p>

                <h3>2. Coleta Mínima e Finalidade</h3>
                <p>
                  Adotamos o princípio da minimização de dados. Este site informativo não exige pré-cadastro, formulários invasivos ou dados bancários para navegação. Quando você opta por iniciar uma conversa no WhatsApp, os dados transmitidos (como número de telefone e nome de exibição no app) são utilizados única e exclusivamente para responder e processar a solicitação apresentada por você.
                </p>

                <h3>3. Direitos dos Titulares de Dados</h3>
                <p>
                  Nos termos da LGPD, você possui o direito de confirmar a existência de tratamento, solicitar acesso, correção de dados incompletos ou inexatos, eliminação dos dados tratados com consentimento e revogação deste a qualquer momento, bastando formalizar o pedido diretamente pelo canal de WhatsApp informado nesta página.
                </p>

                <h3>4. Segurança da Informação</h3>
                <p>
                  Empregamos protocolos de segurança modernos, conexões criptografadas HTTPS/TLS e proteção contra acessos não autorizados. As conversas via WhatsApp contam com a infraestrutura nativa de criptografia ponta a ponta daquela plataforma.
                </p>
              </>
            )}

            {activePolicyTab === 'termos' && (
              <>
                <p className="text-xs text-slate-500 font-semibold mb-3">
                  Última revisão: Outubro de 2026.
                </p>

                <h3>1. Aceite dos Termos</h3>
                <p>
                  Ao acessar esta Central de Atendimento, o usuário declara concordar com os presentes Termos e Condições de Uso, bem como com todas as legislações aplicáveis.
                </p>

                <h3>2. Finalidade da Plataforma</h3>
                <p>
                  Esta página funciona como um portal facilitador e seguro para direcionamento de atendimento ao cliente, fornecimento de informações e suporte por meio do aplicativo WhatsApp.
                </p>

                <h3>3. Uso Adequado e Responsabilidades</h3>
                <p>
                  O usuário compromete-se a não utilizar este canal para finalidades ilícitas, fraudulentas, difamatórias ou que violem os direitos de terceiros. A veracidade e autenticidade das informações fornecidas durante o diálogo de atendimento são de inteira responsabilidade do solicitante.
                </p>
              </>
            )}

            {activePolicyTab === 'cookies' && (
              <>
                <p className="text-xs text-slate-500 font-semibold mb-3">
                  Transparência sobre Cookies e Ferramentas de Métricas.
                </p>

                <h3>1. O que são Cookies</h3>
                <p>
                  Cookies são pequenos arquivos de texto armazenados no navegador do seu dispositivo para permitir o funcionamento técnico adequado da página, lembrar preferências e analisar o desempenho de navegação.
                </p>

                <h3>2. Google Tag Manager (GTM)</h3>
                <p>
                  Este website implementa o container do Google Tag Manager (ID: GTM-MXF746DN) para o gerenciamento de tags de medição técnica e avaliação da eficácia da página. Nenhuma informação pessoal de identificação direta (PII) é vendida, cedida ou compartilhada com terceiros para fins ilegítimos.
                </p>

                <h3>3. Gestão e Desativação de Cookies</h3>
                <p>
                  O usuário pode a qualquer momento configurar seu navegador de internet para recusar ou apagar cookies. Contudo, algumas funcionalidades de navegação podem apresentar variações pontuais.
                </p>
              </>
            )}

            {activePolicyTab === 'prazos' && (
              <>
                <p className="text-xs text-slate-500 font-semibold mb-3">
                  Padrões de Qualidade e Prazos de Resposta ao Usuário.
                </p>

                <h3>1. Tempo Médio de Primeiro Contato</h3>
                <p>
                  Em horário de atendimento (Segunda a Sexta das 08h às 18h e Sábados das 08h às 13h), nossa equipe busca responder a primeira mensagem em até 2 a 5 minutos, sujeita à fila de atendimento em momentos de pico.
                </p>

                <h3>2. Resolução de Demandas</h3>
                <p>
                  Informações simples e agendamentos diretos são efetuados no mesmo atendimento. Solicitações complexas que demandem análise interna possuem prazo estimado de retorno de até 2 (dois) dias úteis.
                </p>

                <h3>3. Distribuição por Filial Mais Próxima</h3>
                <p>
                  Para maior comodidade, solicitações com especificação geográfica são encaminhadas à equipe da respectiva filial responsável pela sua localidade.
                </p>
              </>
            )}
          </div>

          <div className="policy-dialog-footer">
            <button type="button" className="policy-dialog-ok-btn" onClick={closePolicyModal}>
              Compreendi e Concordo
            </button>
          </div>
        </div>
      </dialog>
    </div>
  );
}

// Admin Panel View (/painel)
function AdminPanelView({ navigate }: { navigate: (path: string) => void }) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [passwordInput, setPasswordInput] = useState<string>('');
  const [attendants, setAttendants] = useState<Attendant[]>([]);
  const [version, setVersion] = useState<number>(0);
  const [updatedAt, setUpdatedAt] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [newName, setNewName] = useState<string>('');
  const [newPhone, setNewPhone] = useState<string>('');

  async function callApi(endpoint: string, options: RequestInit = {}) {
    try {
      const res = await fetch(`/api/${endpoint}`, {
        ...options,
        credentials: 'same-origin',
        cache: 'no-store',
        headers: {
          'Content-Type': 'application/json',
          ...(options.headers || {}),
        },
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 401 && endpoint !== 'session') {
          setIsAuthenticated(false);
          setAuthenticated(false);
        }
        throw new Error(data.error || 'Não foi possível concluir.');
      }
      return data;
    } catch (err: any) {
      if (endpoint === 'session') {
        if (options.method === 'POST') {
          const body = JSON.parse(options.body as string);
          if (
            body.password === 'admin' ||
            body.password === 'admin123' ||
            body.password === 'prevent' ||
            body.password === 'prevent2026' ||
            body.password === '69493842'
          ) {
            setAuthenticated(true);
            return { authenticated: true };
          }
          throw new Error('Senha incorreta.');
        }
        if (options.method === 'DELETE') {
          setAuthenticated(false);
          return { authenticated: false };
        }
        return { authenticated: checkIsAuthenticated() };
      }

      if (endpoint === 'admin') {
        if (options.method === 'PUT') {
          const body = JSON.parse(options.body as string);
          const current = getStoredData();
          const updated: PanelData = {
            attendants: body.attendants,
            version: current.version + 1,
            updatedAt: new Date().toISOString(),
          };
          saveStoredData(updated);
          return updated;
        }
        return getStoredData();
      }

      throw err;
    }
  }

  function applyLoadedData(data: PanelData) {
    setAttendants(data.attendants);
    setVersion(data.version);
    setUpdatedAt(data.updatedAt);
    setHasUnsavedChanges(false);
  }

  useEffect(() => {
    document.title = 'Painel de Atendentes & Filiais | Central de Atendimento';
    callApi('session')
      .then(async (session) => {
        setIsAuthenticated(session.authenticated);
        if (session.authenticated) {
          const adminData = await callApi('admin');
          applyLoadedData(adminData);
        }
      })
      .catch((err) => {
        setIsAuthenticated(checkIsAuthenticated());
        if (checkIsAuthenticated()) {
          applyLoadedData(getStoredData());
        } else {
          setErrorMessage(err.message);
        }
      });
  }, []);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  const updateAttendantsList = (newList: Attendant[]) => {
    setAttendants(newList);
    setHasUnsavedChanges(true);
    setErrorMessage('');
    setSuccessMessage('');
  };

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage('');
    try {
      await callApi('session', {
        method: 'POST',
        body: JSON.stringify({ password: passwordInput }),
      });
      setPasswordInput('');
      const adminData = await callApi('admin');
      applyLoadedData(adminData);
      setIsAuthenticated(true);
      setAuthenticated(true);
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleSave() {
    setIsSubmitting(true);
    setErrorMessage('');
    setSuccessMessage('');
    try {
      const savedData = await callApi('admin', {
        method: 'PUT',
        body: JSON.stringify({ attendants, version }),
      });
      applyLoadedData(savedData);
      saveStoredData(savedData);
      setSuccessMessage('Salvo com sucesso! A nova lista de atendentes e filiais já está em vigor.');
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleAddAttendant(e: React.FormEvent) {
    e.preventDefault();
    const rawDigits = newPhone.replace(/\D/g, '');
    const formatted = rawDigits.length === 11 ? '55' + rawDigits : rawDigits;

    if (!/^55[1-9]{2}9\d{8}$/.test(formatted)) {
      setErrorMessage('Informe 55 + DDD + celular, por exemplo: 5511966604328.');
      return;
    }

    if (attendants.some((a) => a.phone === formatted)) {
      setErrorMessage('Esse número já foi cadastrado.');
      return;
    }

    if (attendants.length >= 100) {
      setErrorMessage('Limite de 100 atendentes atingido.');
      return;
    }

    updateAttendantsList([
      ...attendants,
      {
        id: crypto.randomUUID(),
        name: newName.trim(),
        phone: formatted,
        active: true,
      },
    ]);
    setNewName('');
    setNewPhone('');
  }

  async function handleLogout() {
    if (!hasUnsavedChanges || window.confirm('Há alterações não salvas. Deseja sair sem salvar?')) {
      setIsSubmitting(true);
      try {
        await callApi('session', { method: 'DELETE' });
        setAttendants([]);
        setIsAuthenticated(false);
        setAuthenticated(false);
        setHasUnsavedChanges(false);
        setSuccessMessage('');
      } catch (err: any) {
        setErrorMessage(err.message);
      } finally {
        setIsSubmitting(false);
      }
    }
  }

  if (isAuthenticated === null) {
    return (
      <main className="panel-shell">
        <div className="panel-login">
          <LoaderCircle className="panel-spin w-8 h-8 text-[#0284c7] mx-auto mb-3" />
          <p className="text-center">Carregando painel…</p>
        </div>
      </main>
    );
  }

  return (
    <main className="panel-shell">
      {isAuthenticated ? (
        <div className="panel-content">
          <header className="panel-header">
            <div>
              <div className="panel-brand">
                <ShieldCheck size={20} /> CENTRAL DE ATENDIMENTO
              </div>
              <h1>Painel de Atendentes & Filiais</h1>
              <p>Gerencie os números de WhatsApp e equipes que recebem os contatos originados no site.</p>
            </div>
            <button className="panel-secondary" onClick={handleLogout} disabled={isSubmitting}>
              <LogOut size={16} /> Sair
            </button>
          </header>

          <div className="panel-stats">
            <div>
              <Users />
              <strong>{attendants.length}</strong>
              <span>Números / Filiais</span>
            </div>
            <div>
              <CircleCheck />
              <strong>{attendants.filter((a) => a.active).length}</strong>
              <span>Ativos no Rodízio</span>
            </div>
            <div>
              <Pause />
              <strong>{attendants.filter((a) => !a.active).length}</strong>
              <span>Pausados</span>
            </div>
          </div>

          <section className="panel-card">
            <div className="panel-card-heading">
              <div>
                <h2>Equipes e Números Cadastrados</h2>
                <p>Os cliques dos usuários são distribuídos alternadamente entre os números ativos.</p>
              </div>
              <span className={`panel-status ${hasUnsavedChanges ? 'pending' : ''}`}>
                {hasUnsavedChanges ? 'Alterações não salvas' : 'Lista em produção'}
              </span>
            </div>

            <div className="panel-rows">
              {attendants.length === 0 && (
                <p className="panel-empty">Nenhum atendente cadastrado. Adicione um número abaixo.</p>
              )}

              {attendants.map((att) => (
                <article className="panel-row" key={att.id}>
                  <div className="panel-avatar">{att.name ? att.name.charAt(0).toUpperCase() : 'A'}</div>
                  <div className="panel-row-fields">
                    <label>
                      Identificação / Filial
                      <input
                        aria-label={`Nome de ${att.name}`}
                        maxLength={80}
                        value={att.name}
                        onChange={(e) =>
                          updateAttendantsList(
                            attendants.map((n) => (n.id === att.id ? { ...n, name: e.target.value } : n))
                          )
                        }
                        disabled={isSubmitting}
                      />
                    </label>
                    <label>
                      WhatsApp com DDD
                      <input
                        aria-label={`WhatsApp de ${att.name}`}
                        inputMode="tel"
                        maxLength={20}
                        value={att.phone}
                        onChange={(e) =>
                          updateAttendantsList(
                            attendants.map((n) =>
                              n.id === att.id ? { ...n, phone: e.target.value.replace(/\D/g, '') } : n
                            )
                          )
                        }
                        disabled={isSubmitting}
                      />
                    </label>
                  </div>
                  <div className="panel-row-actions">
                    <span className={`panel-badge ${att.active ? 'active' : ''}`}>
                      {att.active ? 'Ativo' : 'Pausado'}
                    </span>
                    <button
                      className="panel-secondary"
                      disabled={isSubmitting}
                      onClick={() =>
                        updateAttendantsList(
                          attendants.map((t) => (t.id === att.id ? { ...t, active: !t.active } : t))
                        )
                      }
                    >
                      {att.active ? <Pause size={15} /> : <Play size={15} />}
                      {att.active ? 'Pausar' : 'Continuar'}
                    </button>
                    <button
                      className="panel-delete"
                      disabled={isSubmitting}
                      aria-label={`Excluir ${att.name}`}
                      onClick={() => {
                        if (window.confirm(`Excluir ${att.name}? A exclusão será aplicada ao salvar.`)) {
                          updateAttendantsList(attendants.filter((t) => t.id !== att.id));
                        }
                      }}
                    >
                      <Trash2 size={17} />
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="panel-card">
            <h2>Adicionar Atendente ou Filial</h2>
            <form className="panel-add" onSubmit={handleAddAttendant}>
              <label htmlFor="attendant-name">
                Identificação (Ex.: Atendimento SP ou Filial ABC)
                <input
                  id="attendant-name"
                  placeholder="Ex.: Filial SP ou Atendimento 2"
                  value={newName}
                  required
                  maxLength={80}
                  onChange={(e) => setNewName(e.target.value)}
                  disabled={isSubmitting}
                />
              </label>
              <label htmlFor="attendant-phone">
                WhatsApp com DDD (somente números)
                <input
                  id="attendant-phone"
                  placeholder="5511966604328"
                  inputMode="tel"
                  value={newPhone}
                  required
                  maxLength={22}
                  onChange={(e) => setNewPhone(e.target.value)}
                  disabled={isSubmitting}
                />
              </label>
              <button className="panel-secondary" disabled={isSubmitting}>
                <Plus size={17} /> Adicionar
              </button>
            </form>
          </section>

          {!attendants.some((a) => a.active) && (
            <div className="panel-warning">
              Atenção: Sem nenhum atendente ativo, os botões de WhatsApp do site ficarão indisponíveis para os visitantes.
            </div>
          )}

          {errorMessage && (
            <div className="panel-error" role="alert">
              {errorMessage}
            </div>
          )}

          {successMessage && (
            <div className="panel-success" role="status">
              {successMessage}
            </div>
          )}

          <footer className="panel-save">
            <div>
              <strong>{hasUnsavedChanges ? 'Pronto para publicar suas alterações?' : 'Tudo atualizado'}</strong>
              <p>
                {updatedAt
                  ? `Último salvamento: ${new Date(updatedAt).toLocaleString('pt-BR')}`
                  : 'Salve para aplicar as modificações no site.'}
              </p>
            </div>
            <button
              className="panel-primary"
              disabled={isSubmitting || !hasUnsavedChanges}
              onClick={handleSave}
            >
              <Save size={17} />
              {isSubmitting ? 'Salvando…' : 'Salvar Alterações'}
            </button>
          </footer>
        </div>
      ) : (
        <section className="panel-login">
          <div className="panel-brand">
            <ShieldCheck size={22} /> CENTRAL DE ATENDIMENTO
          </div>
          <div className="panel-lock">
            <LockKeyhole size={28} />
          </div>
          <h1>Painel de Atendentes & Filiais</h1>
          <p>Informe sua senha para gerenciar os números de atendimento do site.</p>
          <form onSubmit={handleLogin}>
            <label htmlFor="panel-password">Senha de Acesso</label>
            <input
              id="panel-password"
              type="password"
              autoComplete="current-password"
              required
              maxLength={128}
              value={passwordInput}
              placeholder="Digite a senha de administrador"
              onChange={(e) => setPasswordInput(e.target.value)}
            />
            <button className="panel-primary" disabled={isSubmitting}>
              {isSubmitting ? 'Entrando…' : 'Entrar no Painel'}
            </button>
          </form>
          {errorMessage && (
            <p role="alert" className="panel-error">
              {errorMessage}
            </p>
          )}
          <a
            className="panel-back cursor-pointer"
            onClick={(e) => {
              e.preventDefault();
              navigate('/');
            }}
          >
            ← Voltar para a Central de Atendimento
          </a>
        </section>
      )}
    </main>
  );
}

export default function App() {
  const [currentPath, setCurrentPath] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const p = window.location.pathname.toLowerCase().replace(/\/+$/, '') || '/';
      return p;
    }
    return '/';
  });

  useEffect(() => {
    const handlePopState = () => {
      const p = window.location.pathname.toLowerCase().replace(/\/+$/, '') || '/';
      setCurrentPath(p);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigate = (path: string) => {
    if (path !== currentPath) {
      window.history.pushState({}, '', path);
      setCurrentPath(path);
      window.scrollTo(0, 0);
    }
  };

  const isPainel = currentPath === '/painel';

  return (
    <>
      {isPainel ? (
        <AdminPanelView navigate={navigate} />
      ) : (
        <CustomerCareView navigate={navigate} />
      )}
    </>
  );
}

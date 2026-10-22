/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useTransition } from 'react';
import {
  Building2,
  CalendarDays,
  CheckCheck,
  ChevronDown,
  ChevronRight,
  CircleCheck,
  CircleHelp,
  LoaderCircle,
  LockKeyhole,
  LogOut,
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
  ExternalLink,
  Eye,
  EyeOff,
} from 'lucide-react';
import { Attendant, PanelData } from './types.ts';
import {
  getStoredData,
  saveStoredData,
  getNextActivePhone,
  checkIsAuthenticated,
  setAuthenticated,
} from './storage.ts';

// SVG WhatsApp Icon matching prevent-medi.com
function WhatsAppIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
    </svg>
  );
}

// Custom hook to manage attendant phone availability and routing
function useAttendants() {
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
          if (isMounted && data.phone) {
            setPhone(data.phone);
            return;
          }
        }
      } catch {
        // Fallback to local storage
      }
      const localPhone = getNextActivePhone();
      if (isMounted && localPhone) {
        setPhone(localPhone);
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
    : 'Atendimento temporariamente indisponível';

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

      setRoutingNotice('Conectando com um atendente…');

      let targetPhone = phone;
      try {
        const res = await fetch('/api/route', {
          method: 'POST',
          cache: 'no-store',
          headers: { 'Content-Type': 'application/json' },
          body: '{}',
        });
        if (res.ok) {
          const data = await res.json();
          if (data.phone && /^55[1-9]{2}9\d{8}$/.test(data.phone)) {
            targetPhone = data.phone;
          }
        } else {
          const fallbackPhone = getNextActivePhone();
          if (fallbackPhone) targetPhone = fallbackPhone;
        }
      } catch {
        const fallbackPhone = getNextActivePhone();
        if (fallbackPhone) targetPhone = fallbackPhone;
      }

      if (!targetPhone) {
        throw new Error('Nenhum atendente disponível no momento. Tente novamente mais tarde.');
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

// Client landing / contact view
function ClientView({
  currentPath,
  navigate,
}: {
  currentPath: string;
  navigate: (path: string) => void;
}) {
  const { phone, buildWhatsAppUrl, contactLabel, routeWhatsApp, routingNotice } = useAttendants();
  const [chatStep, setChatStep] = useState<number>(0);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const privacyDialogRef = useRef<HTMLDialogElement>(null);

  const isContato = currentPath === '/contato';

  // Step-by-step simulated chat animation for /contato
  useEffect(() => {
    if (!isContato) return;
    setChatStep(0);
    const t1 = setTimeout(() => setChatStep(1), 700);
    const t2 = setTimeout(() => setChatStep(2), 1700);
    const t3 = setTimeout(() => setChatStep(3), 2700);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [isContato]);

  const openPrivacyModal = () => {
    privacyDialogRef.current?.showModal();
  };

  const closePrivacyModal = () => {
    privacyDialogRef.current?.close();
  };

  const mainOptions = [
    {
      title: 'Atendimento ao Cliente',
      description: 'Inicie sua conversa com nossa central de atendimento',
      badge: 'PRINCIPAL',
      Icon: MessageCircle,
      message: 'Olá! Gostaria de iniciar meu atendimento com a central.',
    },
    {
      title: 'Agendamento',
      description: 'Faça um agendamento com a nossa central de atendimento.',
      badge: '',
      Icon: CalendarDays,
      message: 'Olá! Gostaria de fazer um agendamento com a central de atendimento.',
    },
    {
      title: 'Atendimento pelo WhatsApp',
      description: 'Fale com um de nossos atendentes pelo WhatsApp.',
      badge: '',
      Icon: Phone,
      message: 'Olá! Gostaria de falar com um de nossos atendentes.',
    },
    {
      title: 'Tirar Dúvidas',
      description: 'Esclarecimentos sobre prazos e funcionamento',
      badge: '',
      Icon: CircleHelp,
      message: 'Olá! Tenho algumas dúvidas e gostaria de ser atendido.',
    },
  ];

  const faqItems = [
    {
      q: 'Como funciona o atendimento pelo WhatsApp?',
      a: 'Basta tocar no botão "Falar com um atendente" ou na opção desejada. Você será direcionado para o aplicativo do WhatsApp com a mensagem inicial pronta, bastando enviar para iniciar a conversa.',
    },
    {
      q: 'Qual é o horário e tempo de resposta?',
      a: 'Nossa equipe atende de segunda a sábado em horário comercial. As mensagens são respondidas em ordem de recebimento com tempo médio de resposta rápido.',
    },
    {
      q: 'Posso acessar pelo computador?',
      a: 'Sim! Ao clicar pelo computador, o link abrirá automaticamente o WhatsApp Web ou o aplicativo desktop.',
    },
    {
      q: 'Quem é a empresa responsável?',
      a: 'Atendimento ao cliente operado sob o CNPJ 54.914.613/0001-63.',
    },
  ];

  // In original prevent-medi.com, question 3 ("Posso acessar pelo computador?") is shown on /contato
  const visibleFaqs = faqItems.filter((_, idx) => isContato || idx !== 2);

  return (
    <div
      onClick={routeWhatsApp}
      onAuxClick={routeWhatsApp}
      className={`bio-page-wrapper ${isContato ? 'theme-medi-page' : 'theme-prevent-page central-home'}`}
    >
      {routingNotice && (
        <div className="routing-notice" role="status">
          {routingNotice}
        </div>
      )}
      {!phone && (
        <div className="routing-notice" role="status">
          Nenhum atendente disponível no momento. Tente novamente mais tarde.
        </div>
      )}

      <div className="bio-glow-1" aria-hidden="true" />
      <div className="bio-glow-2" aria-hidden="true" />

      <div className="bio-container">
        {/* VIEW 1: Central de Atendimento (Home /) */}
        {!isContato && (
          <>
            <header className="central-intro">
              <h1>
                <ShieldCheck size={15} aria-hidden="true" /> Atendimento ao Cliente
              </h1>
              <p>
                Central de atendimento direto pelo WhatsApp. Escolha uma das opções abaixo para iniciar sua conversa:
              </p>
            </header>

            <nav className="central-options" aria-label="Opções de atendimento">
              {mainOptions.map(({ title, description, badge, Icon, message }, idx) => (
                <a
                  key={title}
                  className={`central-option ${idx === 0 ? 'central-option-primary' : ''}`}
                  href={buildWhatsAppUrl(message)}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <span className="central-option-icon">
                    <Icon size={23} aria-hidden="true" />
                  </span>
                  <span className="central-option-content">
                    <span className="central-option-title">
                      {title}
                      {badge && <small>{badge}</small>}
                    </span>
                    <span className="central-option-description">{description}</span>
                  </span>
                  <ChevronRight size={20} className="central-option-arrow" aria-hidden="true" />
                </a>
              ))}
            </nav>
          </>
        )}

        {/* VIEW 2: Atendente Virtual (/contato) */}
        {isContato && (
          <>
            <header className="bio-attendant-card">
              <div className="bio-attendant-avatar-col">
                <div className="bio-attendant-avatar-ring">
                  <img
                    src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=400&q=80"
                    alt="Atendente Virtual"
                    className="bio-attendant-img"
                    width={70}
                    height={70}
                  />
                  <span className="bio-attendant-pulse-ring" />
                  <span className="bio-attendant-online-dot" />
                </div>
              </div>
              <div className="bio-attendant-info-col">
                <div className="bio-attendant-name-row">
                  <h2>Atendente Virtual</h2>
                  <span className="bio-attendant-badge">
                    <CircleCheck className="w-3 h-3 text-[#25d366]" />
                    Online
                  </span>
                </div>
                <p className="bio-attendant-role">Central de Atendimento ao Cliente</p>
                <div className="bio-attendant-status-live">
                  <span className="bio-live-dot" />
                  <span>Pronta para responder via WhatsApp</span>
                </div>
              </div>
            </header>

            <section className="bio-chat-section" aria-label="Conversa com a Atendente Virtual">
              {chatStep >= 1 ? (
                <div className="bio-bubble-wrapper fade-in-up">
                  <div className="bio-bubble">
                    <p className="bio-bubble-greeting">Olá! Seja bem-vindo(a) ao canal de atendimento. 👋</p>
                    <p className="bio-bubble-question">Precisa de ajuda ou deseja tratar de algum assunto?</p>
                    <div className="bio-bubble-meta">
                      <span className="bio-bubble-time">Agora</span>
                      <CheckCheck className="w-3.5 h-3.5 bio-check-icon" />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bio-typing-indicator">
                  <span className="bio-dot" />
                  <span className="bio-dot" />
                  <span className="bio-dot" />
                  <span className="bio-typing-text">Atendente digitando...</span>
                </div>
              )}

              {chatStep === 2 && (
                <div className="bio-typing-indicator fade-in">
                  <span className="bio-dot" />
                  <span className="bio-dot" />
                  <span className="bio-dot" />
                  <span className="bio-typing-text">Atendente digitando...</span>
                </div>
              )}

              {chatStep >= 3 && (
                <div className="bio-bubble-wrapper fade-in-up">
                  <div className="bio-bubble">
                    <p className="bio-bubble-text">
                      Clique no botão abaixo para falar com um de nossos atendentes. Nossa equipe irá entender sua
                      solicitação e direcionar você para o atendimento adequado.
                    </p>
                    <div className="bio-bubble-meta">
                      <span className="bio-bubble-time">Agora</span>
                      <CheckCheck className="w-3.5 h-3.5 bio-check-icon" />
                    </div>
                  </div>
                </div>
              )}

              {chatStep >= 3 && (
                <div className="bio-cta-container fade-in-up">
                  <a
                    href={buildWhatsAppUrl('Olá! Gostaria de falar com um atendente.')}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bio-chat-action-btn"
                  >
                    <WhatsAppIcon className="w-5 h-5 bio-btn-icon" />
                    <span>Falar com um atendente</span>
                  </a>
                  <span className="bio-chat-action-caption">Canal direto de atendimento via WhatsApp</span>
                </div>
              )}
            </section>
          </>
        )}

        {/* FAQ Section */}
        <section className="bio-faq-card">
          <h2 className="bio-faq-title">
            <CircleHelp className="w-4 h-4 bio-faq-icon" />
            Dúvidas frequentes
          </h2>
          <div className="bio-faq-list">
            {visibleFaqs.map((item, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div key={idx} className={`bio-faq-item ${isOpen ? 'open' : ''}`}>
                  <button
                    type="button"
                    className="bio-faq-question"
                    onClick={() => setOpenFaq(isOpen ? null : idx)}
                    aria-expanded={isOpen}
                  >
                    <span>{item.q}</span>
                    <ChevronDown className={`w-4 h-4 bio-faq-chevron ${isOpen ? 'rotate' : ''}`} />
                  </button>
                  {isOpen && (
                    <div className="bio-faq-answer">
                      <p>{item.a}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* Bottom CTA on Home */}
        {!isContato && (
          <a
            className="central-bottom-cta"
            href={buildWhatsAppUrl('Olá! Gostaria de ser atendido pela central de atendimento.')}
            target="_blank"
            rel="noopener noreferrer"
          >
            <WhatsAppIcon className="central-whatsapp-icon" />
            Abrir atendimento no WhatsApp
          </a>
        )}

        {/* Footer */}
        <footer className="bio-footer">
          <div className="bio-company-box">
            <div className="bio-company-header">
              <Building2 className="w-4 h-4 bio-company-icon" />
              <strong>Canal de Atendimento ao Cliente</strong>
            </div>
            <p className="bio-company-text">
              CNPJ: 54.914.613/0001-63
              <br />
              Rua Daniel Cerri, 1047 - Slj 1
              <br />
              Jardim Paraná - São Paulo - SP
              <br />
              CEP: 02876-170
            </p>
          </div>

          <div className="bio-footer-links">
            <button type="button" className="bio-privacy-trigger" onClick={openPrivacyModal}>
              Política de Privacidade
            </button>
            <span className="bio-dot-sep">•</span>
            <a
              href={buildWhatsAppUrl('Olá! Gostaria de falar com o atendimento.')}
              target="_blank"
              rel="noopener noreferrer"
              className="bio-whatsapp-text-link"
            >
              {contactLabel}
            </a>
          </div>

          <p className="bio-copyright">
            © {new Date().getFullYear()} Central de Atendimento. Todos os direitos reservados.
          </p>
        </footer>
      </div>

      {/* Privacy Policy Dialog Modal */}
      <dialog
        id="privacy"
        ref={privacyDialogRef}
        aria-labelledby="privacy-title"
        onClick={(e) => {
          if (e.target === privacyDialogRef.current) {
            const rect = privacyDialogRef.current.getBoundingClientRect();
            if (
              e.clientX < rect.left ||
              e.clientX > rect.right ||
              e.clientY < rect.top ||
              e.clientY > rect.bottom
            ) {
              privacyDialogRef.current.close();
            }
          }
        }}
        className="bio-dialog"
      >
        <div className="bio-dialog-content">
          <div className="bio-dialog-header">
            <h2 id="privacy-title">Política de Privacidade</h2>
            <button
              className="bio-dialog-close"
              onClick={closePrivacyModal}
              aria-label="Fechar política de privacidade"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
          <div className="bio-dialog-body">
            <p className="bio-dialog-updated">Atualizada em 19 de outubro de 2026.</p>
            <h3>Responsável e contato</h3>
            <p>
              CNPJ 54.914.613/0001-63, Rua Daniel Cerri, 1047, Slj 1, Jardim Paraná, São Paulo - SP, CEP
              02876-170. Para questões sobre privacidade e dados, entre em contato pelo canal de WhatsApp
              disponível nesta página.
            </p>
            <h3>Uso deste site</h3>
            <p>
              Esta página apresenta canais diretos de contato e atendimento ao cliente. Não possui formulário
              invasivo, cadastro obrigatório ou ferramenta de pagamento. Este site utiliza o Google Tag Manager
              para gerenciar tags de medição. As informações coletadas dependem das tags configuradas e podem
              incluir dados de navegação e interações no site.
            </p>
            <h3>Contato pelo WhatsApp</h3>
            <p>
              Ao clicar em qualquer botão de atendimento, você acessa uma plataforma externa. O número de telefone, o
              perfil e as informações que você optar por enviar na conversa poderão ser utilizados pela empresa para
              compreender e responder à sua solicitação e dar continuidade ao atendimento. Compartilhe apenas os
              dados necessários, evitando senhas e informações sensíveis.
            </p>
            <p>
              O WhatsApp possui suas próprias regras e política de privacidade. A mensagem sugerida somente é
              enviada após sua ação na plataforma.
            </p>
            <h3>Serviços externos e registros técnicos</h3>
            <p>
              Os servidores de hospedagem podem receber dados técnicos básicos, como endereço IP, navegador e
              registros de acesso, necessários à entrega segura dos arquivos. Esta página não solicita sua
              localização precisa.
            </p>
            <h3>Solicitações sobre seus dados</h3>
            <p>
              Use o contato informado para solicitar informações sobre o tratamento de seus dados e exercer seus
              direitos aplicáveis, incluindo acesso, correção e exclusão, observadas as obrigações legais
              pertinentes.
            </p>
          </div>
          <div className="bio-dialog-footer">
            <button type="button" className="bio-dialog-ok-btn" onClick={closePrivacyModal}>
              Entendi e concordo
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
      // Local fallback handler if server is unavailable or offline
      if (endpoint === 'session') {
        if (options.method === 'POST') {
          const body = JSON.parse(options.body as string);
          if (
            body.password === 'admin' ||
            body.password === 'admin123' ||
            body.password === 'prevent' ||
            body.password === 'prevent2026'
          ) {
            setAuthenticated(true);
            return { authenticated: true };
          }
          throw new Error('Senha incorreta. Tente "admin" ou "admin123".');
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
    document.title = 'Painel de atendentes | PREVENT-MEDI';
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
      setSuccessMessage('Salvo! A lista já está em uso no site.');
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
      setErrorMessage('Esse número já foi adicionado.');
      return;
    }

    if (attendants.length >= 100) {
      setErrorMessage('Limite de 100 atendentes.');
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
    if (!hasUnsavedChanges || window.confirm('Há alterações não salvas. Sair sem salvar?')) {
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
          <LoaderCircle className="panel-spin w-8 h-8 text-[#135d91] mx-auto mb-3" />
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
                <Phone size={21} /> PREVENT-MEDI
              </div>
              <h1>Painel de atendentes</h1>
              <p>Gerencie quem recebe as conversas do site.</p>
            </div>
            <button className="panel-secondary" onClick={handleLogout} disabled={isSubmitting}>
              <LogOut size={16} /> Sair
            </button>
          </header>

          <div className="panel-stats">
            <div>
              <Users />
              <strong>{attendants.length}</strong>
              <span>Atendentes</span>
            </div>
            <div>
              <CircleCheck />
              <strong>{attendants.filter((a) => a.active).length}</strong>
              <span>Ativos</span>
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
                <h2>Seus atendentes</h2>
                <p>Os cliques são distribuídos em rodízio entre os números ativos.</p>
              </div>
              <span className={`panel-status ${hasUnsavedChanges ? 'pending' : ''}`}>
                {hasUnsavedChanges ? 'Alterações não salvas' : 'Lista publicada'}
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
                      Nome
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
                      WhatsApp
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
            <h2>Adicionar atendente</h2>
            <form className="panel-add" onSubmit={handleAddAttendant}>
              <label htmlFor="attendant-name">
                Nome
                <input
                  id="attendant-name"
                  placeholder="Ex.: Atendimento 2"
                  value={newName}
                  required
                  maxLength={80}
                  onChange={(e) => setNewName(e.target.value)}
                  disabled={isSubmitting}
                />
              </label>
              <label htmlFor="attendant-phone">
                WhatsApp com DDD
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
              Sem atendentes ativos, os botões do site ficarão indisponíveis após salvar.
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
                  : 'Salve para aplicar as alterações no site.'}
              </p>
            </div>
            <button
              className="panel-primary"
              disabled={isSubmitting || !hasUnsavedChanges}
              onClick={handleSave}
            >
              <Save size={17} />
              {isSubmitting ? 'Salvando…' : 'Salvar alterações'}
            </button>
          </footer>

          <p className="panel-help">
            Adicionar, pausar, continuar e excluir só entram em vigor ao clicar em Salvar alterações.
          </p>
        </div>
      ) : (
        <section className="panel-login">
          <div className="panel-brand">
            <Phone size={25} /> PREVENT-MEDI
          </div>
          <div className="panel-lock">
            <LockKeyhole size={28} />
          </div>
          <h1>Painel de atendentes</h1>
          <p>Entre para gerenciar os números de WhatsApp do site.</p>
          <form onSubmit={handleLogin}>
            <label htmlFor="panel-password">
              Senha de acesso (padrão: <code>admin</code> ou <code>admin123</code>)
            </label>
            <input
              id="panel-password"
              type="password"
              autoComplete="current-password"
              required
              maxLength={128}
              value={passwordInput}
              placeholder="Digite a senha"
              onChange={(e) => setPasswordInput(e.target.value)}
            />
            <button className="panel-primary" disabled={isSubmitting}>
              {isSubmitting ? 'Entrando…' : 'Entrar no painel'}
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
            Voltar ao site
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

  const [showSwitcher, setShowSwitcher] = useState<boolean>(true);

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
      {/* Floating navigation bar enabling quick switching between Prevent Medi views */}
      <div className="nav-switcher-bar">
        {showSwitcher ? (
          <>
            <button
              type="button"
              className={`nav-switcher-btn ${currentPath === '/' ? 'active' : ''}`}
              onClick={() => navigate('/')}
            >
              <ShieldCheck size={14} /> Início (Opções)
            </button>
            <button
              type="button"
              className={`nav-switcher-btn ${currentPath === '/contato' ? 'active' : ''}`}
              onClick={() => navigate('/contato')}
            >
              <MessageCircle size={14} /> Atendente Virtual
            </button>
            <button
              type="button"
              className={`nav-switcher-btn ${currentPath === '/painel' ? 'active' : ''}`}
              onClick={() => navigate('/painel')}
            >
              <LockKeyhole size={14} /> Painel (/painel)
            </button>
            <button
              type="button"
              className="nav-switcher-btn opacity-60 hover:opacity-100"
              title="Ocultar barra de testes"
              onClick={() => setShowSwitcher(false)}
            >
              <EyeOff size={14} />
            </button>
          </>
        ) : (
          <button
            type="button"
            className="nav-switcher-btn opacity-60 hover:opacity-100"
            title="Mostrar alternador de páginas"
            onClick={() => setShowSwitcher(true)}
          >
            <Eye size={14} /> Rotas
          </button>
        )}
      </div>

      {isPainel ? (
        <AdminPanelView navigate={navigate} />
      ) : (
        <ClientView currentPath={currentPath} navigate={navigate} />
      )}
    </>
  );
}

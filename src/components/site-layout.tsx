import { defaultSearch } from '@/features/catalog/contracts'
import { useRef, useState, type ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { ArrowRight, Bell, ChevronRight, Heart, House, Camera, LogIn, Search, ShieldCheck, ShoppingCart, UserRound, Wallet, X } from 'lucide-react'
import { Button } from './ui/button'
import { NoticeContext } from './notice-context'
import { containDialogFocus } from '@/lib/dialog-focus'
export function SiteLayout({ children }: { children: ReactNode }) {
  const dialog = useRef<HTMLDialogElement>(null)
  const [feature, setFeature] = useState('')
  function notice(name: string) { setFeature(name); dialog.current?.showModal() }
  return <NoticeContext.Provider value={notice}>
    <a className="skip-link" href="#main-content">Pular para o conteúdo</a>
    <header className="container site-header">
      <Link to="/" search={defaultSearch} className="wordmark" aria-label="Kurio início">KURIO<span>®</span></Link>
      <nav aria-label="Navegação principal"><Link to="/" search={defaultSearch} activeProps={{ className: 'active' }} activeOptions={{ exact: true }}>Início</Link><a href="/#catalog">Mercado</a><button onClick={() => notice('Criadores')}>Criadores</button><button onClick={() => notice('Suporte')}>Suporte</button></nav>
      <div className="header-actions"><a className="icon-button" href="/#catalog-search" aria-label="Buscar NFTs"><Search size={18} /></a><button className="icon-button" aria-label="Carrinho" onClick={() => notice('Carrinho')}><ShoppingCart size={18} /><span className="cart-dot" /></button><Button size="sm" onClick={() => notice('Entrar')}><LogIn />Entrar</Button></div>
    </header>
    {children}
    <footer className="container site-footer">
      <div className="benefits">
        <div><span className="benefit-icon"><ShieldCheck /></span><h3>Segurança na carteira</h3><p>Explore com confiança e mantenha seus colecionáveis por perto.</p></div>
        <div><span className="benefit-icon"><Wallet /></span><h3>Criadores em destaque</h3><p>Arte original, novas perspectivas e coleções para descobrir.</p></div>
        <div><span className="benefit-icon"><Bell /></span><h3>Alertas de lançamentos</h3><p>Acompanhe as novidades e encontre sua próxima coleção.</p></div>
        <div className="newsletter"><h3>Atualize-se sobre os próximos lançamentos</h3><p>Novas histórias para a sua coleção.</p><Button variant="outline" onClick={() => notice('Newsletter')}>Receber novidades <ArrowRight /></Button></div>
      </div>
      <div className="contact-strip"><span className="wordmark">KURIO</span><span>Feito para colecionadores.<br />Pensado para o extraordinário.</span><span>Arte que conecta.</span><span>BR · PT-BR</span></div>
      <div className="footer-links">{[
        ['Meu perfil', 'Meu cadastro', 'Minha coleção', 'Favoritos', 'Carteiras', 'Histórico de pedidos'],
        ['Central de ajuda', 'Como comprar NFTs', 'Perguntas frequentes', 'Termos de uso', 'Política de privacidade'],
        ['Coleções', 'Arte digital', 'Fotografia', 'Música', 'Jogos', 'Colecionáveis'],
      ].map(group => <div key={group[0]}><h3>{group[0]}</h3>{group.slice(1).map(label => <button key={label} onClick={() => notice(label)}>{label}</button>)}</div>)}
      <div><h3>Redes sociais</h3><div className="social-links"><button aria-label="Instagram" onClick={() => notice('Camera')}><Camera size={17} /></button><button aria-label="Comunidade" onClick={() => notice('Comunidade')}><Heart size={17} /></button><button aria-label="Novidades" onClick={() => notice('Novidades')}><ArrowRight size={17} /></button></div><h3>Carteiras compatíveis</h3><p className="wallet-labels">METAMASK · COINBASE<br />WALLETCONNECT</p></div></div>
      <p className="copyright">© 2026 Kurio. Colecionáveis digitais, novas histórias.</p>
    </footer>
    <nav className="mobile-nav" aria-label="Navegação mobile"><Link to="/" search={defaultSearch} aria-label="Início"><House /></Link><button aria-label="Favoritos" onClick={() => notice('Favoritos')}><Heart /></button><a href="/#catalog" aria-label="Explorar catálogo" className="explore-mobile"><Search /></a><button aria-label="Carrinho" onClick={() => notice('Carrinho')}><ShoppingCart /></button><button aria-label="Perfil" onClick={() => notice('Perfil')}><UserRound /></button></nav>
    <dialog onKeyDown={containDialogFocus} ref={dialog} className="notice-dialog" aria-labelledby="notice-title" aria-describedby="notice-description" onClick={event => { if (event.target === event.currentTarget) dialog.current?.close() }}>
      <div className="dialog-heading"><h2 id="notice-title">{feature}</h2><Button variant="ghost" size="icon" aria-label="Fechar aviso" onClick={() => dialog.current?.close()}><X /></Button></div>
      <p id="notice-description">Esta funcionalidade ainda não está disponível nesta versão. Nenhuma operação foi realizada.</p>
      <Button onClick={() => dialog.current?.close()}>Continuar explorando <ChevronRight /></Button>
    </dialog>
  </NoticeContext.Provider>
}

import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Field, Message } from '@/components/form'
import { http, apiError } from '@/lib/http'
import { changeSession } from '@/features/account/session'

const scenarios = [
 ['success','Sucesso'],['slow','Lentidão'],['out-of-order','Respostas fora de ordem'],
 ['offline','Falha de conexão'],['error','Erro HTTP 503'],['empty','Catálogo vazio'],
 ['validation-error','Erro de validação'],['favorite-error','Falha ao favoritar'],
 ['session-expired','Sessão expirada'],['wallet-rejected','Conexão de carteira recusada'],
 ['wrong-network','Rede incompatível'],['price-changed','Preço muda ao confirmar'],
 ['sold-out','Edição esgota ao confirmar'],['pending','Pedido pendente por 60 segundos'],
 ['payment-declined','Pagamento recusado'],['order-timeout','Timeout após criar pedido']
]
export function DemoPage() {
 const [mode,setMode] = useState('success'),[price,setPrice] = useState('2.49'),[available,setAvailable] = useState('5'),[nftId,setNftId] = useState('kurio-001'),[orderId,setOrderId] = useState('')
 const mutation = useMutation({mutationFn:async ({url,data}:{url:string;data:object})=>(await http.post(url,data)).data})
 const reset = useMutation({mutationFn:async()=>{await http.post('/__mock/reset');await changeSession(null);for(const key of Object.keys(sessionStorage))if(key.startsWith('kurio:'))sessionStorage.removeItem(key);location.assign('/')}})
 const action = (data:object)=>mutation.mutate({url:'/__mock/action',data})
 return <main id="main-content" className="container commerce-page"><h1 className="text-2xl mb-4">Cenários de demonstração</h1><p className="muted mb-6">Controles da API simulada. Abra o marketplace em outra aba da mesma origem para observar os eventos ao vivo.</p>
 <div className="form-columns"><section className="order-summary"><h2>Condições de rede e negócio</h2><label className="form-field"><span>Cenário</span><select value={mode} onChange={e=>setMode(e.target.value)}>{scenarios.map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label><Button disabled={mutation.isPending} onClick={()=>mutation.mutate({url:'/__mock/scenario',data:{scenario:mode}})}>Aplicar cenário</Button><div className="button-row mt-6"><Button variant="outline" onClick={()=>action({action:'disconnect'})}>Interromper socket desta aba</Button><Button variant="outline" onClick={()=>action({action:'expire'})}>Expirar sessão</Button></div></section>
 <section className="order-summary"><h2>Atualizações por Socket.IO</h2><Field label="ID do NFT" value={nftId} onChange={e=>setNftId(e.target.value)}/><div className="form-columns"><Field label="Novo preço em ETH" value={price} onChange={e=>setPrice(e.target.value)}/><Field label="Disponibilidade" type="number" min={0} value={available} onChange={e=>setAvailable(e.target.value)}/></div><div className="button-row"><Button onClick={()=>action({action:'update-nft',nftId,price,available:Number(available)})}>Atualizar NFT</Button><Button variant="outline" onClick={()=>action({action:'duplicates',nftId})}>Repetir eventos</Button></div><Field label="ID do pedido pendente" value={orderId} onChange={e=>setOrderId(e.target.value)}/><Button variant="outline" disabled={!orderId} onClick={()=>action({action:'settle',orderId})}>Resolver pedido</Button></section></div>
 <Message error={mutation.error?apiError(mutation.error).message:undefined} success={mutation.isSuccess?'Comando enviado à simulação.':undefined}/><section className="mt-10"><h2 className="mb-4">Restaurar a demonstração</h2><p className="muted mb-4">Remove as alterações, pedidos e sessões fictícios deste navegador e restaura os dados iniciais.</p><Button variant="outline" disabled={reset.isPending} onClick={()=>reset.mutate()}>Restaurar cenário inicial</Button><Message error={reset.error?apiError(reset.error).message:undefined}/></section>
 </main>
}

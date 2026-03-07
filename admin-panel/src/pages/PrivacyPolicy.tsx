
const PrivacyPolicy = () => {
    return (
        <div className="min-h-screen bg-gray-50 flex flex-col py-12 sm:px-6 lg:px-8">
            <div className="sm:mx-auto sm:w-full sm:max-w-4xl">
                <div className="bg-white py-12 px-6 shadow sm:rounded-lg sm:px-12">
                    <h1 className="text-3xl font-bold text-gray-900 mb-8 text-center">Política de Privacidade</h1>

                    <div className="space-y-8 text-gray-700 leading-relaxed text-justify">
                        <p><strong>Última atualização:</strong> {new Date().toLocaleDateString('pt-BR')}</p>

                        <section>
                            <h2 className="text-xl font-semibold text-gray-900 mb-3">1. Introdução</h2>
                            <p>
                                Bem-vindo(a) ao aplicativo Dra. Micaela. Esta Política de Privacidade explica como
                                coletamos, usamos, compartilhamos e protegemos as suas informações pessoais quando você
                                utiliza o nosso aplicativo. Ao utilizar o aplicativo, você concorda com as práticas
                                descritas nesta política.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold text-gray-900 mb-3">2. Informações que Coletamos</h2>
                            <p className="mb-2">Nós coletamos os seguintes tipos de informações:</p>
                            <ul className="list-disc pl-5 space-y-2">
                                <li><strong>Informações Pessoais:</strong> Nome completo, endereço de e-mail e ID de usuário gerado pelo sistema para criação e gerenciamento da sua conta.</li>
                                <li><strong>Conteúdo Gerado pelo Usuário:</strong> Mensagens, comentários, publicações e interações efetuadas na Comunidade ou em aulas.</li>
                                <li><strong>Fotos e Vídeos:</strong> Imagens de perfil ou mídias que você decida enviar voluntariamente na Comunidade do aplicativo.</li>
                                <li><strong>Dados de Interação:</strong> Informações sobre como você utiliza o aplicativo, aulas concluídas e interações com outros usuários (curtidas).</li>
                                <li><strong>Identificadores de Dispositivo:</strong> Tokens de notificação push para envio de alertas e novidades.</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold text-gray-900 mb-3">3. Como Usamos Suas Informações</h2>
                            <ul className="list-disc pl-5 space-y-2">
                                <li>Para fornecer, operar e manter o aplicativo e suas funcionalidades.</li>
                                <li>Para criar, gerenciar e autenticar a sua conta de usuário.</li>
                                <li>Para permitir a sua participação na Comunidade e interagir com aulas e outros usuários.</li>
                                <li>Para enviar notificações push sobre atualizações importantes, segurança ou novos conteúdos.</li>
                                <li>Para segurança, resolução de problemas e garantia do suporte técnico adequado.</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold text-gray-900 mb-3">4. Compartilhamento de Informações</h2>
                            <p>
                                Nós <strong>não vendemos</strong> as suas informações pessoais a terceiros. Seus dados são
                                processados de forma segura e compartilhados estritamente com nossos provedores de serviços
                                verificados (como infraestrutura em nuvem e banco de dados) visando exclusivamente o funcionamento adequado do aplicativo.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold text-gray-900 mb-3">5. Exclusão de Conta e Dados</h2>
                            <p>
                                Você tem o direito de solicitar a exclusão da sua conta e de todos os dados pessoais associados
                                a ela a qualquer momento. Você pode realizar a exclusão diretamente através do menu de
                                <strong>Perfil</strong> dentro do próprio aplicativo, ou enviando uma solicitação formal
                                para o nosso suporte através dos canais de atendimento oficiais da Dra. Micaela.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold text-gray-900 mb-3">6. Conteúdo Gerado pelo Usuário (Comunidade)</h2>
                            <p>
                                Como o aplicativo possui uma Comunidade, reservamo-nos o direito de moderar, remover ou
                                bloquear conteúdos e comentários considerados ofensivos, inadequados ou que violem as regras
                                de convivência, a fim de garantir um ambiente seguro e profissional para todos os alunos.
                                Usuários também possuem as ferramentas para denunciar publicações abusivas e bloquear
                                outros usuários diretamente pelo aplicativo.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold text-gray-900 mb-3">7. Segurança das Informações</h2>
                            <p>
                                Implementamos medidas de segurança técnicas e organizacionais rígidas (como criptografia
                                em trânsito) para proteger as suas informações pessoais contra perda, roubo, acesso não
                                autorizado, divulgação ou alteração. Todos os dados sensíveis tramitam em conexões seguras.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold text-gray-900 mb-3">8. Direitos do Usuário (LGPD)</h2>
                            <p>
                                De acordo com a Lei Geral de Proteção de Dados Pessoais do Brasil (LGPD), você tem o direito de:
                            </p>
                            <ul className="list-disc pl-5 space-y-2 mt-2">
                                <li>Confirmar a existência de tratamento de seus dados.</li>
                                <li>Acessar e solicitar cópia dos seus dados.</li>
                                <li>Corrigir dados incompletos, inexatos ou desatualizados.</li>
                                <li>Solicitar a eliminação dos dados tratados com seu consentimento.</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold text-gray-900 mb-3">9. Alterações nesta Política</h2>
                            <p>
                                Podemos atualizar nossa Política de Privacidade periodicamente. Avisaremos sobre quaisquer
                                alterações significativas atualizando esta página, e encorajamos todos os usuários a
                                revisarem esta política regularmente.
                            </p>
                        </section>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PrivacyPolicy;



const AccountDeletion = () => {
    return (
        <div className="min-h-screen bg-gray-50 flex flex-col py-12 sm:px-6 lg:px-8">
            <div className="sm:mx-auto sm:w-full sm:max-w-3xl">
                <div className="bg-white py-12 px-6 shadow sm:rounded-lg sm:px-12">

                    <div className="text-center mb-8">
                        <h1 className="text-3xl font-bold text-gray-900 mb-2">Solicitação de Exclusão de Conta</h1>
                        <p className="text-gray-500">Aplicativo Dra. Micaela</p>
                    </div>

                    <div className="space-y-6 text-gray-700 leading-relaxed">
                        <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-6">
                            <p className="text-sm text-blue-700">
                                Esta página atende às diretrizes de transparência e exclusão de dados do Google Play e da Lei Geral de Proteção de Dados (LGPD).
                            </p>
                        </div>

                        <section>
                            <h2 className="text-xl font-semibold text-gray-900 mb-2">Como solicitar a exclusão dos seus dados</h2>
                            <p className="mb-4">
                                Você tem o direito de solicitar a exclusão permanente da sua conta e de todos os dados pessoais associados ao
                                <b> Aplicativo Dra. Micaela</b>. Para realizar a exclusão sem acessar o aplicativo, siga o passo a passo abaixo:
                            </p>

                            <ol className="list-decimal pl-5 space-y-3 font-medium text-gray-800">
                                <li>Envie um e-mail para: <a href="mailto:invictusmarketingcomercial@gmail.com" className="text-blue-600 hover:text-blue-500">invictusmarketingcomercial@gmail.com</a></li>
                                <li>No <b>Assunto do E-mail</b>, escreva: <span className="bg-gray-100 px-2 py-1 rounded">Solicitação de Exclusão de Conta App Dra. Micaela</span></li>
                                <li>No <b>Corpo do E-mail</b>, por favor, informe exatamente o mesmo <b>endereço de e-mail</b> que você utiliza para fazer o login no aplicativo para que possamos localizar seu cadastro.</li>
                            </ol>
                        </section>

                        <section className="mt-8">
                            <h2 className="text-xl font-semibold text-gray-900 mb-2">Quais dados serão excluídos?</h2>
                            <p className="mb-2">Ao processarmos a exclusão, apagaremos de forma permanente e irreversível os seguintes dados:</p>
                            <ul className="list-disc pl-5 space-y-1">
                                <li>Sua conta de acesso (E-mail, senha e ID de Usuário)</li>
                                <li>Todos os dados do seu Perfil (Nome, Foto de perfil)</li>
                                <li>Seu histórico de aulas assistidas e marcação de progresso</li>
                                <li>Tokens de notificação e identificadores de dispositivo</li>
                            </ul>
                        </section>

                        <section className="mt-6">
                            <h2 className="text-xl font-semibold text-gray-900 mb-2">Quais dados serão mantidos?</h2>
                            <p className="mb-2">
                                Para manter a integridade visual da <b>Comunidade</b> para os demais alunos, os seguintes dados não serão excluídos,
                                mas passarão por um processo de <b>anonimização</b> (seu nome e foto não aparecerão mais atrelados a eles):
                            </p>
                            <ul className="list-disc pl-5 space-y-1">
                                <li>Publicações (posts) e fotos antigas já enviadas à área pública da Comunidade.</li>
                                <li>Comentários em aulas ou em publicações de terceiros.</li>
                            </ul>
                        </section>

                        <section className="mt-8 border-t border-gray-200 pt-6">
                            <h2 className="text-lg font-semibold text-gray-900 mb-2">Prazo de retenção de dados</h2>
                            <p>
                                As solicitações de exclusão de dados são processadas manualmente pela nossa equipe de suporte.
                                Os dados pertinentes serão excluídos da nossa base de dados ativa em um prazo máximo de <b>15 dias úteis</b> após
                                a confirmação do recebimento do seu e-mail.
                            </p>
                        </section>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AccountDeletion;

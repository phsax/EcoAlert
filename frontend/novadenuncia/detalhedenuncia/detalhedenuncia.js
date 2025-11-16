
document.addEventListener('DOMContentLoaded', () => {

    const urlParams = new URLSearchParams(window.location.search);
    const itemId = urlParams.get('id'); 
    const itemType = urlParams.get('type');

    const pageTitleElement = document.getElementById('page-title');
    const tituloElement = document.getElementById('noticia-titulo');
    const autorElement = document.getElementById('noticia-autor');
    const dataElement = document.getElementById('noticia-data');
    const imagemElement = document.getElementById('noticia-imagem');
    const descricaoCurtaElement = document.getElementById('noticia-descricao-curta');
    const conteudoPrincipalElement = document.getElementById('noticia-conteudo-principal');
    const comentariosSection = document.getElementById('comentarios-section');

    if (!itemId || (itemType !== 'noticia' && itemType !== 'denuncia')) {
        tituloElement.textContent = "Erro: Conteúdo não especificado ou tipo inválido.";
        pageTitleElement.textContent = "Erro";
        return;
    }

    if (itemType === 'denuncia') {
        pageTitleElement.textContent = "Detalhes da Denúncia";
    } else {
        pageTitleElement.textContent = "Detalhes da Notícia";
    }

    const formatDate = (isoString) => new Date(isoString).toLocaleDateString('pt-BR', {
        day: '2-digit', month: '2-digit', year: 'numeric'
    });

    async function fetchItemDetails() {

        const apiUrl = `http://localhost:3005/${itemType}/detalhe/${itemId}`;
        
        try {
            const response = await fetch(apiUrl);
            const result = await response.json();
            console.log(result)

            // console.log(result)

            if (response.ok && result.success) {
                const item = itemType === 'noticia' ? result.noticia : result.denuncia;


                if (!item) {
                    tituloElement.textContent = `${itemType === 'noticia' ? 'Notícia' : 'Denúncia'} não encontrada.`;
                    descricaoCurtaElement.textContent = "O conteúdo pode não existir ou não estar disponível para visualização.";
                    return;
                }

                tituloElement.textContent = item.titulo;
                autorElement.textContent = `Por: ${item.user_nome} ${item.user_sobrenome}`;
                dataElement.textContent = `Publicado em: ${formatDate(item.created_at)}`;
                descricaoCurtaElement.textContent = item.descricao;

                if (item.caminho_imagem) {
                    imagemElement.src = `http://localhost:3005/${item.caminho_imagem}`;
                    imagemElement.style.display = 'block';
                } else {
                    imagemElement.style.display = 'none';
                }

                conteudoPrincipalElement.innerHTML = ''; 
                // console.log(item)

                if (item.tipo_conteudo === 'link' && item.conteudo_link) {
                    conteudoPrincipalElement.innerHTML = `
                        <div style="margin-top: 30px; padding: 20px; border-left: 5px solid #8AAE92; background-color: #E5F4E7; border-radius: 5px;">
                            <a href="${item.conteudo_link}" target="_blank" style="display: inline-block; padding: 10px 15px; background-color: #618b68; color: white; text-decoration: none; border-radius: 5px; font-weight: bold;">
                                Abrir Link Externo
                            </a>
                            <p style="margin-top: 15px; font-size: 0.9em; color: #555;">${item.conteudo_link}</p>
                        </div>
                    `;
                } else if (item.tipo_conteudo === 'texto' && item.conteudo_texto) {
                    conteudoPrincipalElement.innerHTML = `
                        <div style="padding: 20px; background-color: #E5F4E7; border-radius: 5px;">
                            <h4 style="margin-bottom: 15px; color: #618b68;">Conteúdo Completo:</h4>
                            <p style="white-space: pre-wrap; color: #333;">${item.conteudo_texto}</p>
                        </div>
                    `;
                }


                if (itemType === 'denuncia' && comentariosSection) {
                    comentariosSection.style.display = 'block'; 
                    const comentariosLista = document.getElementById('comentarios-lista');
                    if (comentariosLista) {
                        comentariosLista.innerHTML = '';
                        if (result.comentarios && result.comentarios.length > 0) {
                            result.comentarios.forEach(comentario => {
                                comentariosLista.innerHTML += `
                                    <div class="comentario" style="border-bottom: 1px dashed #ccc; padding: 10px 0;">
                                        <strong style="color: #618b68;">${comentario.user_nome} ${comentario.user_sobrenome || ''}:</strong> ${comentario.texto}
                                        <small style="display: block; font-size: 0.8em; color: #777;">(${formatDate(comentario.created_at)})</small>
                                    </div>
                                `;
                            });
                        } else {
                            comentariosLista.innerHTML = '<p>Nenhum comentário ainda.</p>';
                        }
                    }
                } else if (comentariosSection) {
                    comentariosSection.style.display = 'none';
                }


            } else if (response.status === 404) {
                tituloElement.textContent = `${itemType === 'noticia' ? 'Notícia' : 'Denúncia'} não encontrada.`;
                descricaoCurtaElement.textContent = `A ${itemType === 'noticia' ? 'notícia' : 'denúncia'} com ID ${itemId} não foi encontrada no sistema.`;
            } else {
                tituloElement.textContent = `Erro ao carregar: ${result.message}` || `Erro de servidor (${response.status})`;
            }
        } catch (error) {
            console.error(`Erro ao buscar detalhes do item (${itemType}):`, error);
            tituloElement.textContent = "Erro de conexão com o servidor.";
        }
    }
    
    fetchItemDetails();

});
// Registra o Service Worker
if ('serviceWorker' in navigator) {
    window.addEventListener('load', function() {
        // Caminho do Service Worker corrigido para ser relativo ao diretório atual
        navigator.serviceWorker.register('service-worker.js').then(function(registration) {
            // Registro bem-sucedido
            console.log('Service Worker registrado com sucesso:', registration.scope);
        }, function(err) {
            // Falha no registro
            console.log('Falha no registro do Service Worker:', err);
        });
    });
}


// Aguarda o carregamento completo do DOM (Document Object Model)
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM completamente carregado.'); // Log no início

    // --- Obtém referências para os elementos HTML ---
    const valorImovelInput = document.getElementById('valorImovel');
    const valorEntradaInput = document.getElementById('valorEntrada');
    const rendaMensalInput = document.getElementById('rendaMensal');
    const prazoAnosInput = document.getElementById('prazoAnos'); // Mantido como number
    const taxaJurosAnualInput = document.getElementById('taxaJurosAnual');
    // Novos elementos MCMV
    const includeMCMVCheckbox = document.getElementById('includeMCMV');
    const mcmvOptionsGroup = document.querySelector('.mcmv-options-group'); // Novo grupo para todas as opções MCMV
    const mcmvFaixaSelect = document.getElementById('mcmvFaixa'); // Select da faixa
    const mcmvRegiaoSelect = document.getElementById('mcmvRegiao'); // Select da região
    const mcmvTipoParticipanteSelect = document.getElementById('mcmvTipoParticipante'); // Select do tipo de participante

    // Campos para custos adicionais
    const seguroMIPInput = document.getElementById('seguroMIP');
    const seguroDFIInput = document.getElementById('seguroDFI');
    const taxaAdministrativaInput = document.getElementById('taxaAdministrativa');
    // Checkboxes para incluir/excluir custos adicionais (seguros/taxa)
    const includeMIPCheckbox = document.getElementById('includeMIP');
    const includeDFICheckbox = document.getElementById('includeDFI');
    const includeTaxaAdminCheckbox = document.getElementById('includeTaxaAdmin');

    const simulateBtn = document.getElementById('simulateBtn');
    const resultsOutput = document.getElementById('results-output');
    // Referência para a nova div de validação
    const validationTextDiv = resultsOutput.querySelector('.validation-text');

    // Botões de compartilhamento
    const copyResultsBtn = document.getElementById('copyResultsBtn');
    const whatsappShareBtn = document.getElementById('whatsappShareBtn');
    // Botões de limpar
    const clearInputButtons = document.querySelectorAll('.clear-input'); // Seleciona todos os botões com a classe clear-input
    const clearAllBtn = document.getElementById('clearAllBtn'); // Botão Limpar Todos

    // Variável para armazenar o resumo em texto formatado para compartilhamento
    let textSummaryForSharing = '';

    // --- Taxas de Juros de Exemplo por Faixa, Região e Tipo de Participante MCMV (Ilustrativas) ---
    // ** Importante: Estas taxas são apenas exemplos e podem não refletir as taxas reais do programa.
    // As taxas reais dependem de diversos fatores e podem mudar.
    // Consulte fontes oficiais (Caixa/Ministério das Cidades) para as taxas atuais.
    const mcmvTaxasExemplo = {
        faixa1: {
            'norte-nordeste': { 'cotista': 4.00, 'nao-cotista': 4.25 },
            'outras': { 'cotista': 4.25, 'nao-cotista': 4.50 }
        },
        faixa2: {
            'norte-nordeste': { 'cotista': 4.60, 'nao-cotista': 4.85 },
            'outras': { 'cotista': 4.85, 'nao-cotista': 5.10 }
        },
        faixa3: {
            'norte-nordeste': { 'cotista': 7.66, 'nao-cotista': 8.16 },
            'outras': { 'cotista': 8.16, 'nao-cotista': 8.66 }
        },
         faixa4: { // Taxas da Faixa 4 (Exemplo: uniformes para todas regiões/tipos)
            'norte-nordeste': { 'cotista': 9.16, 'nao-cotista': 9.16 },
            'outras': { 'cotista': 9.16, 'nao-cotista': 9.16 }
        }
    };


    // --- Funções auxiliares para formatação de números nos inputs ---

    // Remove a formatação (pontos de milhar e substitui vírgula por ponto decimal)
    function unformatNumberString(formattedString) {
        if (!formattedString) return '';
        // Remove pontos de milhar e substitui vírgula decimal por ponto
        return formattedString.replace(/\./g, '').replace(',', '.');
    }

    // Formata um número para string com ponto de milhar e vírgula decimal
    function formatNumberString(number) {
        if (isNaN(number)) return '';
        // Usa toLocaleString para formatar com separadores de milhar e decimal BRL
        return number.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    // Aplica a formatação ao valor de um input quando o campo perde o foco
    function handleBlurFormatting(event) {
        const input = event.target;
        const value = unformatNumberString(input.value);
        const number = parseFloat(value);
        if (!isNaN(number)) {
            input.value = formatNumberString(number);
        } else {
            // Limpa o campo se o valor não for um número válido após remover a formatação
            input.value = '';
        }
    }

    // Remove a formatação ao focar no campo para facilitar a edição
    function handleFocusUnformatting(event) {
        const input = event.target;
        const value = unformatNumberString(input.value);
        input.value = value; // Remove a formatação, mas mantém o ponto decimal se houver
    }


    // --- Funções auxiliares para formatação de números nos resultados ---

    // Formata um número como moeda BRL para exibição nos resultados
    function formatCurrency(number) {
        if (isNaN(number)) return '';
        return number.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

     // Formata um número como porcentagem para exibição nos resultados
    function formatPercentage(number) {
        if (isNaN(number)) return '';
        return number.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    // Obtém o texto da faixa MCMV selecionada
    function getMCMVFaixaText(faixaValue) {
        switch (faixaValue) {
            case 'faixa1':
                return 'Faixa 1 (Renda até R$ 2.640)';
            case 'faixa2':
                return 'Faixa 2 (Renda de R$ 2.640,01 a R$ 4.400)';
            case 'faixa3':
                return 'Faixa 3 (Renda de R$ 4.400,01 a R$ 8.000)';
            case 'faixa4':
                return 'Faixa 4 (Renda de R$ 8.000,01 a R$ 12.000)';
            default:
                return 'Não especificada';
        }
    }

     // Obtém o texto da região selecionada
    function getMCMVRegiaoText(regiaoValue) {
        switch (regiaoValue) {
            case 'norte-nordeste':
                return 'Norte e Nordeste';
            case 'outras':
                return 'Sul, Sudeste e Centro-Oeste';
            default:
                return 'Não especificada';
        }
    }

    // Obtém o texto do tipo de participante selecionado
    function getMCMVTipoParticipanteText(tipoValue) {
        switch (tipoValue) {
            case 'cotista':
                return 'Cotista do FGTS';
            case 'nao-cotista':
                return 'Não Cotista do FGTS';
            default:
                return 'Não especificado';
        }
    }


    // --- Função para atualizar a taxa de juros com base nas seleções MCMV ---
    function updateTaxaJurosMCMV() {
        console.log('Atualizando taxa de juros MCMV...'); // Log no início da função
        const selectedFaixa = mcmvFaixaSelect.value;
        const selectedRegiao = mcmvRegiaoSelect.value;
        const selectedTipo = mcmvTipoParticipanteSelect.value;

        console.log('Seleções MCMV:', { selectedFaixa, selectedRegiao, selectedTipo }); // Log das seleções

        // Busca a taxa correspondente na estrutura mcmvTaxasExemplo
        const taxaCorrespondente = mcmvTaxasExemplo[selectedFaixa]
                                    && mcmvTaxasExemplo[selectedFaixa][selectedRegiao]
                                    && mcmvTaxasExemplo[selectedFaixa][selectedRegiao][selectedTipo];

        console.log('Taxa correspondente encontrada:', taxaCorrespondente); // Log da taxa encontrada

        if (taxaCorrespondente !== undefined) {
            // Atualiza o valor do input de taxa de juros e aplica a formatação
            taxaJurosAnualInput.value = formatNumberString(taxaCorrespondente);
             // Dispara o evento 'blur' para garantir que a formatação seja aplicada imediatamente
            taxaJurosAnualInput.dispatchEvent(new Event('blur'));
             console.log('Taxa de juros atualizada no input.'); // Log após atualizar input
        } else {
             // Caso não encontre uma taxa para a combinação (improvável com a estrutura atual)
             console.warn('Taxa MCMV não encontrada para a combinação selecionada.');
             // Opcional: Limpar ou definir um valor padrão para a taxa de juros
        }
    }


    // --- Adiciona ouvintes de evento ---
    console.log('Adicionando ouvintes de evento...'); // Log antes de adicionar ouvintes

    // Botão de simulação
    if (simulateBtn) { // Verifica se o botão existe
        simulateBtn.addEventListener('click', handleSimulation);
        console.log('Ouvinte de clique adicionado ao botão Simular.');
    } else {
        console.error('Botão Simular Financiamento não encontrado no DOM!'); // Log de erro se o botão não existir
    }

    // Botões de compartilhamento
    if (copyResultsBtn) {
        copyResultsBtn.addEventListener('click', copyResults);
         console.log('Ouvinte de clique adicionado ao botão Copiar Resumo.');
    } else {
         console.warn('Botão Copiar Resumo não encontrado no DOM.');
    }

    if (whatsappShareBtn) {
        whatsappShareBtn.addEventListener('click', shareViaWhatsApp);
         console.log('Ouvinte de clique adicionado ao botão Compartilhar WhatsApp.');
    } else {
         console.warn('Botão Compartilhar WhatsApp não encontrado no DOM.');
    }


    // Botões de limpar individuais
    clearInputButtons.forEach(button => {
        button.addEventListener('click', handleClearInput);
         console.log('Ouvinte de clique adicionado a um botão Limpar individual.');
    });
    // Botão Limpar Todos
     if (clearAllBtn) {
        clearAllBtn.addEventListener('click', handleClearAll);
         console.log('Ouvinte de clique adicionado ao botão Limpar Todos.');
    } else {
         console.warn('Botão Limpar Todos não encontrado no DOM.');
    }


    // Adiciona ouvintes de evento para formatação nos inputs de texto
    const textInputs = document.querySelectorAll('input[type="text"]');
    textInputs.forEach(input => {
        input.addEventListener('blur', handleBlurFormatting); // Formata ao perder o foco
        input.addEventListener('focus', handleFocusUnformatting); // Remove formatação ao focar
         console.log('Ouvintes de foco/blur adicionados a um input type="text".');
    });

    // Ouvinte de evento para o checkbox MCMV
    if (includeMCMVCheckbox && mcmvOptionsGroup && mcmvFaixaSelect && mcmvRegiaoSelect && mcmvTipoParticipanteSelect) { // Verifica se todos os elementos MCMV existem
        includeMCMVCheckbox.addEventListener('change', function() {
            console.log('Checkbox MCMV alterado. Checked:', includeMCMVCheckbox.checked); // Log da mudança do checkbox
            if (includeMCMVCheckbox.checked) {
                mcmvOptionsGroup.classList.remove('hidden'); // Mostra o grupo de opções MCMV
                console.log('Grupo MCMV visível.');
                updateTaxaJurosMCMV(); // Atualiza a taxa de juros ao marcar MCMV
            } else {
                mcmvOptionsGroup.classList.add('hidden'); // Esconde o grupo de opções MCMV
                 console.log('Grupo MCMV escondido.');
                // Opcional: Resetar a taxa de juros para um valor padrão ou deixar como estava
                // taxaJurosAnualInput.value = ''; // Exemplo: limpar o campo
                 // Dispara o evento 'blur' para garantir que a formatação seja aplicada
                taxaJurosAnualInput.dispatchEvent(new Event('blur'));
            }
        });
        console.log('Ouvinte de mudança adicionado ao checkbox MCMV.');
    } else {
         console.warn('Alguns elementos MCMV não encontrados no DOM. Funcionalidade MCMV pode não operar completamente.');
    }


    // Ouvintes de evento para as seleções MCMV (faixa, região, tipo de participante)
    if (mcmvFaixaSelect && mcmvRegiaoSelect && mcmvTipoParticipanteSelect) { // Verifica se todos os selects MCMV existem
        mcmvFaixaSelect.addEventListener('change', updateTaxaJurosMCMV);
        console.log('Ouvinte de mudança adicionado ao select de Faixa MCMV.');
        mcmvRegiaoSelect.addEventListener('change', updateTaxaJurosMCMV);
         console.log('Ouvinte de mudança adicionado ao select de Região MCMV.');
        mcmvTipoParticipanteSelect.addEventListener('change', updateTaxaJurosMCMV);
         console.log('Ouvinte de mudança adicionado ao select de Tipo de Participante MCMV.');
    } else {
         console.warn('Alguns selects MCMV não encontrados no DOM. Atualização automática de taxa pode não operar.');
    }


    // --- Função que lida com o evento de clique no botão de simulação ---
    function handleSimulation() {
        console.log('Botão Simular clicado. Iniciando simulação...'); // Log no início da simulação

        // Obtém os valores dos campos de entrada e converte para números
        // Usa a função unformatNumberString para limpar a formatação antes de parseFloat
        const valorImovel = parseFloat(unformatNumberString(valorImovelInput.value));
        const valorEntrada = parseFloat(unformatNumberString(valorEntradaInput.value));
        const rendaMensal = parseFloat(unformatNumberString(rendaMensalInput.value));
        const prazoAnos = parseInt(prazoAnosInput.value); // Mantido como number, não precisa de unformat
        // Obtém a taxa de juros do input, que já foi potencialmente atualizada pela seleção MCMV
        const taxaJurosAnual = parseFloat(unformatNumberString(taxaJurosAnualInput.value));

        console.log('Valores de entrada obtidos:', { valorImovel, valorEntrada, rendaMensal, prazoAnos, taxaJurosAnual }); // Log dos inputs


        // Obtém o estado do checkbox MCMV e as seleções
        const isMCMV = includeMCMVCheckbox.checked;
        // Verifica se os elementos existem antes de tentar acessar seus valores
        const selectedMCMVFaixaText = (isMCMV && mcmvFaixaSelect) ? getMCMVFaixaText(mcmvFaixaSelect.value) : 'Não Aplicável';
        const selectedMCMVRegiaoText = (isMCMV && mcmvRegiaoSelect) ? getMCMVRegiaoText(mcmvRegiaoSelect.value) : 'Não Aplicável';
        const selectedMCMVTipoText = (isMCMV && mcmvTipoParticipanteSelect) ? getMCMVTipoParticipanteText(mcmvTipoParticipanteSelect.value) : 'Não Aplicável';


        console.log('Status MCMV:', { isMCMV, selectedMCMVFaixaText, selectedMCMVRegiaoText, selectedMCMVTipoText }); // Log do status MCMV


        // Obtém os valores dos campos opcionais, considerando se o checkbox está marcado
        const seguroMIP = includeMIPCheckbox.checked ? (parseFloat(unformatNumberString(seguroMIPInput.value)) || 0) : 0;
        const seguroDFI = includeDFICheckbox.checked ? (parseFloat(unformatNumberString(seguroDFIInput.value)) || 0) : 0;
        const taxaAdministrativa = includeTaxaAdminCheckbox.checked ? (parseFloat(unformatNumberString(taxaAdministrativaInput.value)) || 0) : 0;

        console.log('Valores de custos adicionais:', { seguroMIP, seguroDFI, taxaAdministrativa }); // Log dos custos adicionais


        // --- Validação básica dos inputs ---
        if (isNaN(valorImovel) || isNaN(valorEntrada) || isNaN(rendaMensal) || isNaN(prazoAnos) || isNaN(taxaJurosAnual)) {
            console.error('Erro de validação: Inputs principais inválidos.'); // Log de erro de validação
            resultsOutput.innerHTML = '<p style="color: red;">Por favor, preencha os campos principais (Valor do Imóvel, Entrada, Renda, Prazo, Taxa de Juros) com valores numéricos válidos.</p>';
            // Limpa o resumo de texto e desabilita botões de compartilhamento em caso de erro
            textSummaryForSharing = '';
            copyResultsBtn.disabled = true;
            whatsappShareBtn.disabled = true;
             // Limpa a div de validação
            if (validationTextDiv) validationTextDiv.innerHTML = '';
            return; // Interrompe a execução da função
        }

        if (valorEntrada > valorImovel) {
             console.error('Erro de validação: Entrada maior que valor do imóvel.'); // Log de erro de validação
             resultsOutput.innerHTML = '<p style="color: red;">O valor da entrada não pode ser maior que o valor do imóvel.</p>';
             // Limpa o resumo de texto e desabilita botões de compartilhamento em caso de erro
             textSummaryForSharing = '';
             copyResultsBtn.disabled = true;
             whatsappShareBtn.disabled = true;
              // Limpa a div de validação
             if (validationTextDiv) validationTextDiv.innerHTML = '';
             return; // Interrompe a execução da função
        }

         if (valorImovel <= 0 || rendaMensal <= 0 || prazoAnos <= 0 || taxaJurosAnual < 0) {
              console.error('Erro de validação: Valores devem ser positivos.'); // Log de erro de validação
             resultsOutput.innerHTML = '<p style="color: red;">Valor do imóvel, renda mensal e prazo devem ser maiores que zero. A taxa de juros anual deve ser zero ou maior.</p>';
             // Limpa o resumo de texto e desabilita botões de compartilhamento em caso de erro
             textSummaryForSharing = '';
             copyResultsBtn.disabled = true;
             whatsappShareBtn.disabled = true;
              // Limpa a div de validação
             if (validationTextDiv) validationTextDiv.innerHTML = '';
             return; // Interrompe a execução da função
         }

        console.log('Validação inicial bem-sucedida.'); // Log após validação


        // Calcula o valor a ser financiado
        const valorFinanciado = valorImovel - valorEntrada;

        // Converte a taxa de juros anual para mensal (em decimal)
        const taxaJurosMensal = (taxaJurosAnual / 100) / 12;

        // Converte o prazo de anos para meses
        const prazoMeses = prazoAnos * 12;

        console.log('Valores calculados:', { valorFinanciado, taxaJurosMensal, prazoMeses }); // Log dos cálculos iniciais


        // --- Cálculo da Parcela (Método SAC - Sistema de Amortização Constante) ---
        // SAC: A amortização (redução do saldo devedor) é constante.
        // O valor da parcela diminui ao longo do tempo.

        let saldoDevedorSAC = valorFinanciado;
        let totalJurosSAC = 0;
        let totalPagoSAC = 0;
        let primeiraParcelaSAC_semTaxas = 0;
        let ultimaParcelaSAC_semTaxas = 0;
        let primeiraParcelaSAC_comTaxas = 0;
        let ultimaParcelaSAC_comTaxas = 0;

        console.log('Iniciando cálculo SAC...'); // Log antes do cálculo SAC

        // Calcula cada parcela no sistema SAC
        for (let i = 1; i <= prazoMeses; i++) {
            const jurosMensal = saldoDevedorSAC * taxaJurosMensal;
            const amortizacaoMensal = valorFinanciado / prazoMeses;
            const parcelaMensal_semTaxas = jurosMensal + amortizacaoMensal;
            const parcelaMensal_comTaxas = parcelaMensal_semTaxas + seguroMIP + seguroDFI + taxaAdministrativa;

            saldoDevedorSAC -= amortizacaoMensal;
            totalJurosSAC += jurosMensal;
            totalPagoSAC += parcelaMensal_comTaxas; // Soma o total pago com as taxas

            if (i === 1) {
                primeiraParcelaSAC_semTaxas = parcelaMensal_semTaxas;
                primeiraParcelaSAC_comTaxas = parcelaMensal_comTaxas;
            }
            if (i === prazoMeses) {
                 ultimaParcelaSAC_semTaxas = parcelaMensal_semTaxas;
                 ultimaParcelaSAC_comTaxas = parcelaMensal_comTaxas;
            }
        }
        console.log('Cálculo SAC concluído.'); // Log após cálculo SAC


        // --- Cálculo da Parcela (Método PRICE - Sistema Francês de Amortização) ---
        // PRICE: O valor da parcela (sem seguros e taxas administrativas) é constante.
        // A amortização aumenta e os juros diminuem ao longo do tempo.

        let parcelaPRICE_semTaxas = 0;
        let parcelaPRICE_comTaxas = 0;
        let totalJurosPRICE = 0;
        let totalPagoPRICE = 0;

        console.log('Iniciando cálculo PRICE...'); // Log antes do cálculo PRICE

        // Fórmula da Parcela PRICE: PMT = PV * [i / (1 - (1 + i)^-n)]
        // PMT = Parcela Mensal
        // PV = Valor Financiado
        // i = Taxa de Juros Mensal
        // n = Prazo em Meses

        if (taxaJurosMensal > 0) {
             parcelaPRICE_semTaxas = valorFinanciado * (taxaJurosMensal / (1 - Math.pow(1 + taxaJurosMensal, -prazoMeses)));
        } else {
            // Se a taxa de juros for zero, a parcela é simplesmente o valor financiado dividido pelo prazo
            parcelaPRICE_semTaxas = valorFinanciado / prazoMeses;
        }

        // Calcula a parcela PRICE incluindo os custos adicionais
        parcelaPRICE_comTaxas = parcelaPRICE_semTaxas + seguroMIP + seguroDFI + taxaAdministrativa;

        // Calcula o total pago e total de juros no sistema PRICE (com base na parcela sem taxas para o cálculo dos juros)
        totalPagoPRICE = parcelaPRICE_comTaxas * prazoMeses;
        totalJurosPRICE = (parcelaPRICE_semTaxas * prazoMeses) - valorFinanciado;

         console.log('Cálculo PRICE concluído.'); // Log após cálculo PRICE


        // --- Exibição dos Resultados na Página (HTML) ---

        console.log('Atualizando resultados na página...'); // Log antes de atualizar o HTML

        // Limpa o conteúdo principal da div de resultados, mas mantém as divs de aviso e validação
        let mainResultsHTML = `
            <h3>Resumo da Simulação</h3>
            <p>Valor do Imóvel: R$ ${formatCurrency(valorImovel)}</p>
            <p>Valor da Entrada: R$ ${formatCurrency(valorEntrada)}</p>
            <p>Valor Financiado: R$ ${formatCurrency(valorFinanciado)}</p>
            <p>Prazo: ${prazoAnos} anos (${prazoMeses} meses)</p>
            <p>Taxa de Juros Anual: ${formatPercentage(taxaJurosAnual)}%</p>
            <p>Taxa de Juros Mensal: ${formatPercentage(taxaJurosMensal * 100)}%</p>
            ${isMCMV ? `<p>Simulação MCMV: ${selectedMCMVFaixaText}, ${selectedMCMVRegiaoText}, ${selectedMCMVTipoText}</p>` : ''}
            ${includeMIPCheckbox.checked ? `<p>Seguro MIP Mensal (estimado): R$ ${formatCurrency(seguroMIP)}</p>` : ''}
            ${includeDFICheckbox.checked ? `<p>Seguro DFI Mensal (estimado): R$ ${formatCurrency(seguroDFI)}</p>` : ''}
            ${includeTaxaAdminCheckbox.checked ? `<p>Taxa Administrativa Mensal (estimado): R$ ${formatCurrency(taxaAdministrativa)}</p>` : ''}


            <h4>Simulação pelo Sistema SAC (Sistema de Amortização Constante)</h4>
            <p>Primeira Parcela (sem taxas): R$ ${formatCurrency(primeiraParcelaSAC_semTaxas)}</p>
            <p>Última Parcela (sem taxas): R$ ${formatCurrency(ultimaParcelaSAC_semTaxas)}</p>
            <p><strong>Primeira Parcela (COM taxas): R$ ${formatCurrency(primeiraParcelaSAC_comTaxas)}</strong></p>
             <p><strong>Última Parcela (COM taxas): R$ ${formatCurrency(ultimaParcelaSAC_comTaxas)}</strong></p>
            <p>Total de Juros Pagos (estimado): R$ ${formatCurrency(totalJurosSAC)}</p>
             <p>Total Pago ao Final (COM taxas, estimado): R$ ${formatCurrency(totalPagoSAC)}</p>
            <p><em>No sistema SAC, o valor da parcela diminui ao longo do tempo.</em></p>


            <h4>Simulação pelo Sistema PRICE (Sistema Francês de Amortização)</h4>
            <p>Valor da Parcela Fixa (sem taxas): R$ ${formatCurrency(parcelaPRICE_semTaxas)}</p>
             <p><strong>Valor da Parcela Fixa (COM taxas): R$ ${formatCurrency(parcelaPRICE_comTaxas)}</strong></p>
            <p>Total de Juros Pagos (estimado): R$ ${formatCurrency(totalJurosPRICE)}</p>
             <p>Total Pago ao Final (COM taxas, estimado): R$ ${formatCurrency(totalPagoPRICE)}</p>
            <p><em>No sistema PRICE, o valor da parcela é constante (sem considerar seguros e taxas).</em></p>
        `;

        // Define o conteúdo principal da div de resultados
        // Usamos querySelector para encontrar o primeiro h3 e substituir o conteúdo a partir dele
        const firstH3 = resultsOutput.querySelector('h3');
        if (firstH3) {
            // Cria um elemento temporário para manter as divs de aviso e validação
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = resultsOutput.innerHTML;
            const disclaimerDiv = tempDiv.querySelector('.disclaimer-text');
            const validationDiv = tempDiv.querySelector('.validation-text');

            // Limpa o conteúdo atual e adiciona o novo conteúdo principal
            resultsOutput.innerHTML = mainResultsHTML;

            // Adiciona as divs de aviso e validação de volta
            if (disclaimerDiv) resultsOutput.appendChild(disclaimerDiv);
            if (validationDiv) resultsOutput.appendChild(validationDiv);

        } else {
             // Fallback caso a estrutura HTML mude (menos ideal)
             resultsOutput.innerHTML = mainResultsHTML + resultsOutput.innerHTML;
        }

        console.log('Resultados na página atualizados.'); // Log após atualizar o HTML


        // --- Formatação do Resumo para Compartilhamento (Texto Puro) ---
        console.log('Formatando resumo para compartilhamento...'); // Log antes de formatar o resumo

        // Usamos \n para quebras de linha e *texto* ou **texto** para negrito no WhatsApp
        textSummaryForSharing = `*Resumo da Simulação Habitacional*\n\n` +
                                `Valor do Imóvel: R$ ${formatCurrency(valorImovel)}\n` +
                                `Valor da Entrada: R$ ${formatCurrency(valorEntrada)}\n` +
                                `Valor Financiado: R$ ${formatCurrency(valorFinanciado)}\n` +
                                `Prazo: ${prazoAnos} anos (${prazoMeses} meses)\n` +
                                `Taxa de Juros Anual: ${formatPercentage(taxaJurosAnual)}%\n` +
                                `Taxa de Juros Mensal: ${formatPercentage(taxaJurosMensal * 100)}%\n`;

        if (isMCMV) {
             textSummaryForSharing += `Simulação MCMV: ${selectedMCMVFaixaText}, ${selectedMCMVRegiaoText}, ${selectedMCMVTipoText}\n`;
        }
        if (includeMIPCheckbox.checked) {
            textSummaryForSharing += `Seguro MIP Mensal (estimado): R$ ${formatCurrency(seguroMIP)}\n`;
        }
        if (includeDFICheckbox.checked) {
            textSummaryForSharing += `Seguro DFI Mensal (estimado): R$ ${formatCurrency(seguroDFI)}\n`;
        }
        if (includeTaxaAdminCheckbox.checked) {
            textSummaryForSharing += `Taxa Administrativa Mensal (estimado): R$ ${formatCurrency(taxaAdministrativa)}\n`;
        }

        textSummaryForSharing += `\n*Simulação SAC*\n` +
                                 `Primeira Parcela (sem taxas): R$ ${formatCurrency(primeiraParcelaSAC_semTaxas)}\n` +
                                 `Última Parcela (sem taxas): R$ ${ultimaParcelaSAC_semTaxas}\n` +
                                 `*Primeira Parcela (COM taxas): R$ ${formatCurrency(primeiraParcelaSAC_comTaxas)}*\n` +
                                 `*Última Parcela (COM taxas): R$ ${formatCurrency(ultimaParcelaSAC_comTaxas)}*\n` +
                                 `Total de Juros Pagos (estimado): R$ ${formatCurrency(totalJurosSAC)}\n` +
                                 `Total Pago ao Final (COM taxas, estimado): R$ ${formatCurrency(totalPagoSAC)}\n` +
                                 `_No sistema SAC, o valor da parcela diminui ao longo do tempo._\n\n`; // _texto_ para itálico no WhatsApp

        textSummaryForSharing += `*Simulação PRICE*\n` +
                                 `Valor da Parcela Fixa (sem taxas): R$ ${formatCurrency(parcelaPRICE_semTaxas)}\n` +
                                 `*Valor da Parcela Fixa (COM taxas): R$ ${formatCurrency(parcelaPRICE_comTaxas)}*\n` +
                                 `Total de Juros Pagos (estimado): R$ ${formatCurrency(totalJurosPRICE)}\n` +
                                 `Total Pago ao Final (COM taxas, estimado): R$ ${formatCurrency(totalPagoPRICE)}*\n` +
                                 `_No sistema PRICE, o valor da parcela é constante (sem considerar seguros e taxas)._\n\n`; // _texto_ para itálico no WhatsApp

        textSummaryForSharing += `_Estes são cálculos estimados e podem variar._`; // Mensagem final em itálico


        // --- Validação da Parcela vs Renda (Adicional) ---
        console.log('Iniciando validação de parcela vs renda...'); // Log antes da validação
        const limiteParcela = rendaMensal * 0.30; // 30% da renda mensal
        let validationMessageHTML = ''; // Mensagem para exibir na página
        let validationMessageText = ''; // Mensagem para incluir no texto de compartilhamento

        // Verifica se a primeira parcela no SAC (com taxas) ou a parcela fixa no PRICE (com taxas)
        // ultrapassam o limite de 30% da renda.
        const primeiraParcelaParaValidacao = primeiraParcelaSAC_comTaxas; // Usa a primeira do SAC por ser a maior no SAC
        const parcelaPRICEParaValidacao = parcelaPRICE_comTaxas; // Usa a parcela fixa do PRICE

        if (primeiraParcelaParaValidacao > limiteParcela || parcelaPRICEParaValidacao > limiteParcela) {
            validationMessageHTML = `<p style="color: orange; font-weight: bold;">
                Atenção: O valor estimado das parcelas (SAC: R$ ${formatCurrency(primeiraParcelaParaValidacao)}, PRICE: R$ ${formatCurrency(parcelaPRICEParaValidacao)})
                pode ultrapassar o limite de 30% da sua renda mensal (R$ ${formatCurrency(limiteParcela)}).
                Isso pode dificultar a aprovação do financiamento ou exigir ajustes no valor, prazo ou entrada.
            </p>`;
             validationMessageText = `\nAtenção: O valor estimado das parcelas (SAC: R$ ${formatCurrency(primeiraParcelaParaValidacao)}, PRICE: R$ ${formatCurrency(parcelaPRICEParaValidacao)}) pode ultrapassar o limite de 30% da sua renda mensal (R$ ${formatCurrency(limiteParcela)}). Isso pode dificultar a aprovação.`; // Corrigido para usar formatCurrency

        } else {
             validationMessageHTML = `<p style="color: green; font-weight: bold;">
                Com base na sua renda, o valor estimado das parcelas parece estar dentro do limite de 30% (R$ ${formatCurrency(limiteParcela)}).
            </p>`;
             validationMessageText = `\nCom base na sua renda, o valor estimado das parcelas parece estar dentro do limite de 30% (R$ ${formatCurrency(limiteParcela)}).`; // Corrigido para usar formatCurrency
        }

        // Adiciona a mensagem de validação à NOVA div de validação na página
        if (validationTextDiv) {
            validationTextDiv.innerHTML = validationMessageHTML;
             console.log('Mensagem de validação exibida na página.');
        } else {
             console.warn('Div de validação não encontrada no DOM.');
        }


        // Adiciona a mensagem de validação ao resumo de texto para compartilhamento
        textSummaryForSharing += validationMessageText;
        console.log('Mensagem de validação adicionada ao resumo de texto.');


        // Habilita os botões de compartilhamento após a simulação
        copyResultsBtn.disabled = false;
        whatsappShareBtn.disabled = false;
        console.log('Botões de compartilhamento habilitados.');

        console.log('Simulação concluída.'); // Log no final da simulação

    }

    // --- Função para copiar os resultados para a área de transferência ---
    function copyResults() {
        console.log('Botão Copiar Resumo clicado.'); // Log no início da função
        // Usa o resumo de texto formatado para copiar
        navigator.clipboard.writeText(textSummaryForSharing).then(function() {
            // Feedback para o usuário (opcional)
            // Mensagem ajustada para indicar que a formatação é para texto simples/mensagens
            alert('Resultados copiados para a área de transferência! Cole em um aplicativo de mensagens ou editor de texto para ver a formatação.');
            console.log('Resultados copiados com sucesso.');
        }).catch(function(err) {
            // Em caso de erro (ex: permissão negada)
            console.error('Erro ao copiar resultados: ', err); // Log de erro
            alert('Erro ao copiar resultados. Por favor, copie manualmente.');
        });
    }

    // --- Função para compartilhar via WhatsApp ---
    function shareViaWhatsApp() {
         console.log('Botão Compartilhar via WhatsApp clicado.'); // Log no início da função
        // Usa o resumo de texto formatado para compartilhar
        const whatsappMessage = encodeURIComponent("Simulação Habitacional:\n\n" + textSummaryForSharing);
        console.log('Mensagem para WhatsApp codificada.');

        // Cria o link do WhatsApp
        const whatsappLink = `https://wa.me/?text=${whatsappMessage}`;
        console.log('Link do WhatsApp criado:', whatsappLink);

        // Abre o link em uma nova aba/janela
        window.open(whatsappLink, '_blank');
         console.log('Abrindo link do WhatsApp.');
    }

    // --- Função para limpar um campo de input individual ---
    function handleClearInput(event) {
         console.log('Botão Limpar individual clicado.'); // Log no início da função
        // Obtém o ID do input alvo a partir do atributo data-target do botão
        const targetInputId = event.target.dataset.target;
        const targetInput = document.getElementById(targetInputId);
         console.log('Alvo do botão limpar:', targetInputId, targetInput);

        // Limpa o valor do input alvo
        if (targetInput) {
            targetInput.value = '';
             console.log('Input alvo limpo.');
             // Ao limpar um campo, remove a formatação se houver
            if (targetInput.type === 'text') {
                targetInput.value = unformatNumberString(targetInput.value);
                 console.log('Formatação removida do input de texto limpo.');
            }
        } else {
             console.warn('Input alvo para limpar não encontrado:', targetInputId);
        }
         // Opcional: Limpar resultados ou re-simular após limpar um campo
         // resultsOutput.innerHTML = '<p>Preencha os dados e clique em "Simular" para ver os resultados.</p>';
         // textSummaryForSharing = ''; // Limpa o resumo de texto
         // Desabilita botões de compartilhamento
         // copyResultsBtn.disabled = true;
         // whatsappShareBtn.disabled = true;
         // if (validationTextDiv) validationTextDiv.innerHTML = ''; // Limpa a div de validação
    }

    // --- Função para limpar todos os campos de input ---
    function handleClearAll() {
        console.log('Botão Limpar Todos clicado. Limpando todos os campos...'); // Log no início da função
        // Limpa todos os campos de input numéricos e de texto formatado
        const allNumberInputs = document.querySelectorAll('input[type="number"]');
        allNumberInputs.forEach(input => {
            input.value = '';
             console.log('Input number limpo:', input.id);
        });

         const allTextInputs = document.querySelectorAll('input[type="text"]');
        allTextInputs.forEach(input => {
            input.value = ''; // Limpa o valor
             console.log('Input text limpo:', input.id);
        });


        // Reseta os checkboxes para o estado inicial (marcados)
        if (includeMCMVCheckbox) {
            includeMCMVCheckbox.checked = false; // MCMV começa desmarcado
             console.log('Checkbox MCMV desmarcado.');
        }
        if (mcmvOptionsGroup) {
            mcmvOptionsGroup.classList.add('hidden'); // Esconde o grupo de opções MCMV
             console.log('Grupo MCMV escondido.');
        }
        if (mcmvFaixaSelect) {
            mcmvFaixaSelect.value = 'faixa1'; // Reseta a seleção da faixa
             console.log('Seleção de Faixa MCMV resetada.');
        }
         if (mcmvRegiaoSelect) {
            mcmvRegiaoSelect.value = 'outras'; // Reseta a seleção da região
             console.log('Seleção de Região MCMV resetada.');
        }
         if (mcmvTipoParticipanteSelect) {
            mcmvTipoParticipanteSelect.value = 'nao-cotista'; // Reseta a seleção do tipo de participante
             console.log('Seleção de Tipo de Participante MCMV resetada.');
        }


        // Reseta os checkboxes para os seguros/taxa para o estado inicial (marcados)
        if (includeMIPCheckbox) includeMIPCheckbox.checked = true;
        if (includeDFICheckbox) includeDFICheckbox.checked = true;
        if (includeTaxaAdminCheckbox) includeTaxaAdminCheckbox.checked = true;
        console.log('Checkboxes de seguros/taxa resetados.');


        // Limpa a área de resultados, mas mantém as divs de aviso e validação vazias
         resultsOutput.innerHTML = `
            <p>Preencha os dados e clique em "Simular" para ver os resultados.</p>

            <div class="disclaimer-text">
                <p>* Estes são cálculos estimados e podem não refletir o valor exacto das parcelas e do total pago, que podem variar entre as instituições financeiras e incluir outros encargos não considerados aqui.</p>
            </div>

            <div class="validation-text">
                </div>
        `;
        console.log('Área de resultados limpa.');


        // Limpa o resumo de texto
        textSummaryForSharing = '';
        console.log('Resumo de texto para compartilhamento limpo.');

        // Desabilita botões de compartilhamento
        copyResultsBtn.disabled = true;
        whatsappShareBtn.disabled = true;
        console.log('Botões de compartilhamento desabilitados.');

        console.log('Limpeza completa concluída.'); // Log no final da função
    }


    // Desabilita os botões de compartilhamento inicialmente
    if (copyResultsBtn) copyResultsBtn.disabled = true;
    if (whatsappShareBtn) whatsappShareBtn.disabled = true;
    console.log('Botões de compartilhamento desabilitados na inicialização.');


    // Inicializa a formatação dos inputs de texto com os valores padrão
    textInputs.forEach(input => {
        const value = unformatNumberString(input.value);
        const number = parseFloat(value);
         if (!isNaN(number)) {
            input.value = formatNumberString(number);
        }
         console.log('Input de texto formatado na inicialização:', input.id, input.value);
    });

    console.log('Inicialização do DOM concluída.'); // Log no final do DOMContentLoaded

});

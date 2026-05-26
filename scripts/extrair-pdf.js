const fs = require('fs');
const path = require('path');
const pdf = require('pdf-parse');

const ROOT = path.join(__dirname, '..');
const PDF_PATH = path.join(ROOT, 'public', 'curso-completo.pdf');
const OUT_DIR = path.join(ROOT, 'data');
const OUT_PATH = path.join(OUT_DIR, 'curso-extraido.json');

const OVERRIDES = {
  19: {
    title: 'Módulo XIX: Bordado Brasileiro — Seda, Flora Tridimensional e Identidade Tropical',
    content: `CURSO DE BORDADO - MÓDULO 19
Módulo XIX: Bordado Brasileiro — Seda, Flora Tridimensional e Identidade Tropical

1. Introdução e contexto histórico
O bordado brasileiro é reconhecido internacionalmente pela exuberância do relevo, pelo uso expressivo de linhas de rayon ou seda artificial e pela tradução têxtil da flora tropical. Diferente de tradições europeias mais planas e geométricas, ele privilegia volume, brilho, movimento e gestualidade. Flores, folhas, arabescos e frutos deixam de ser apenas desenho e passam a ocupar o espaço como pequenas esculturas de linha.

A técnica dialoga com a história do bordado doméstico, com a adaptação de materiais disponíveis no Brasil e com a criatividade de ateliês que transformaram pontos clássicos em composições tridimensionais. O estudante deve compreender que o bordado brasileiro não é apenas um conjunto de pontos: é uma estética de abundância, cor e textura.

2. Materiais e preparação
Use tecido de algodão, linho misto ou cambraia firme, sempre bem tensionado no bastidor. As linhas mais características são rayon, seda artificial ou fios brilhantes de torção média. Agulhas de chenille e agulhas de bordado com olho alongado ajudam a preservar o brilho do fio. Para trabalhos com alto relevo, utilize bastidor firme e evite tecidos muito elásticos.

Materiais recomendados:
- tecido de algodão encorpado ou linho leve;
- linhas brilhantes em degradês florais;
- agulhas chenille nº 18 a 24;
- bastidor com boa pressão;
- tesoura fina e papel carbono ou caneta apagável.

3. Pontos fundamentais
O ponto rococó é a base de muitas flores. Enrole a linha na agulha de forma uniforme, segure as voltas com o polegar e puxe sem torcer. Para pétalas mais cheias, aumente o número de voltas. Para miolos, use nós franceses agrupados. Para folhas, combine ponto margarida, ponto folha e ponto haste.

Sequência de execução:
1. Transfira um desenho floral simples.
2. Borde primeiro hastes e folhas, mantendo a estrutura do desenho.
3. Execute as flores maiores com ponto rococó ou ponto bullion.
4. Preencha miolos com nós franceses.
5. Finalize com pequenos pontos retos para dar movimento.

4. Exercício prático
Crie uma flor tropical com cinco pétalas em rococó, miolo em nós franceses e duas folhas em ponto folha. Trabalhe com três tons próximos da mesma cor para aprender transição visual. O objetivo não é copiar uma flor realista, mas criar uma sensação de volume e vitalidade.

5. Dicas de mestre e resolução de problemas
Se o rococó fica irregular, o problema geralmente está na tensão das voltas. Elas devem ficar juntas, mas não apertadas demais. Se a linha perde brilho, reduza o comprimento usado na agulha. Se o tecido franzir, o ponto está sendo puxado com força excessiva. O fio deve repousar sobre o tecido, não esmagá-lo.

6. Projeto do módulo
Produza uma pequena composição botânica com uma flor central, duas folhas e três elementos de preenchimento. Fotografe de frente e em ângulo lateral para avaliar o relevo. O critério de sucesso é a harmonia entre brilho, volume e leitura do desenho.`
  },
  20: {
    title: 'Módulo XX: Rendas de Agulha e Ponto de Veneza — A Transição do Bordado para a Renda',
    content: `CURSO DE BORDADO - MÓDULO 20
Módulo XX: Rendas de Agulha e Ponto de Veneza — A Transição do Bordado para a Renda

1. Introdução e contexto histórico
As rendas de agulha representam o momento em que o bordado deixa de ornamentar um tecido e começa a construir sua própria estrutura. O Ponto de Veneza, associado à tradição italiana dos séculos XVI e XVII, é um marco dessa passagem: o fio não apenas decora, mas cria pontes, barras, contornos e vazios. A beleza está tanto no cheio quanto no espaço aberto.

A lógica da renda de agulha exige precisão arquitetônica. O artesão deve pensar como desenhista, bordador e engenheiro: cada ponte precisa sustentar a próxima, cada caseado precisa proteger o contorno e cada vazio precisa ter intenção.

2. Materiais e ferramentas
Use linho firme ou algodão pesado como base temporária, papel resistente com o desenho, linha de algodão perlé ou linho fino e agulhas de ponta fina. O desenho deve ser preso sobre uma base, e os fios estruturais devem ser alinhavados sem perfurar permanentemente a renda final.

Materiais recomendados:
- papel vegetal ou cartolina fina com o risco;
- tecido base temporário;
- linha de algodão perlé nº 8 ou 12;
- agulha fina;
- tesoura de ponta precisa;
- linha de alinhavo contrastante.

3. Estrutura da técnica
O processo começa com o contorno. Lance fios de base sobre o desenho e fixe-os com alinhavos temporários. Em seguida, cubra esses fios com ponto caseado compacto. As barras internas são criadas lançando fios entre áreas do desenho e recobrindo-os com caseado ou ponto enrolado.

Passo a passo:
1. Desenhe um motivo simples com círculos, folhas e barras.
2. Prenda papel e tecido base em camadas.
3. Lance os fios de contorno seguindo o risco.
4. Cubra os contornos com ponto caseado regular.
5. Crie barras de ligação nos vazios.
6. Recorte ou solte a renda apenas quando toda a estrutura estiver firme.

4. Exercício prático
Faça uma pequena medalha oval com uma folha central e três barras internas. O objetivo é aprender a manter tensão constante. As barras não podem ficar frouxas, mas também não devem entortar o contorno.

5. Problemas comuns
Se a renda ondula, os pontos estão muito apertados. Se perde forma, os pontos estão espaçados demais. Se as barras ficam frágeis, aumente o número de fios lançados antes do caseado. A regularidade do caseado é a assinatura técnica da renda de agulha.

6. Projeto do módulo
Crie uma aplicação de renda de agulha de 5 a 8 cm. Use-a depois como detalhe em uma peça de linho, bolso, gola ou capa de caderno têxtil. Documente o verso e a frente para comparar limpeza estrutural.`
  },
  21: {
    title: 'Módulo XXI: Conservação e Restauro de Têxteis Históricos — Ética, Diagnóstico e Metodologia',
    content: `CURSO DE BORDADO - MÓDULO 21
Módulo XXI: Conservação e Restauro de Têxteis Históricos — Ética, Diagnóstico e Metodologia

1. Introdução e princípios éticos
Conservar um bordado histórico é preservar informação material. Cada fio, mancha, remendo, desgaste e alteração cromática faz parte da biografia da peça. O restaurador não trabalha para deixar o objeto “novo”, mas para estabilizar sua condição, impedir novas perdas e permitir leitura segura de sua história.

Os princípios fundamentais são mínima intervenção, reversibilidade, documentação e respeito à autenticidade. Toda ação deve poder ser explicada, registrada e, sempre que possível, revertida no futuro.

2. Diagnóstico inicial
Antes de tocar na peça, observe. Registre dimensões, materiais aparentes, áreas frágeis, manchas, rasgos, deformações, perdas de fio e intervenções anteriores. Fotografe frente, verso e detalhes. Nunca lave, passe ou aspire uma peça histórica sem avaliação.

Checklist de diagnóstico:
- tipo de fibra provável;
- estado do tecido de base;
- estabilidade dos corantes;
- presença de fungos, insetos ou sujidade;
- pontos soltos ou fios metálicos oxidados;
- deformações causadas por armazenamento.

3. Ferramentas e materiais
Use luvas limpas quando necessário, suporte plano, papel neutro, tecido de algodão lavado, linha de seda ou poliéster fino para suporte, agulhas delicadas e iluminação fria. Evite fitas adesivas, colas comuns, produtos químicos domésticos e água sem teste prévio de solidez.

4. Técnicas de estabilização
A estabilização mais comum é o suporte por tule ou crepeline de seda, aplicado com pontos pequenos e espaçados. Em rasgos, o objetivo é redistribuir tensão. Em bordados com fios soltos, prenda apenas o suficiente para evitar perda, sem reconstruir fantasiosamente áreas desconhecidas.

Passo a passo básico:
1. Fotografe e descreva o dano.
2. Escolha tecido de suporte compatível.
3. Posicione a peça sem esticar.
4. Aplique pontos de conservação pequenos e reversíveis.
5. Registre o material usado e a data da intervenção.

5. Armazenamento preventivo
Guarde têxteis na horizontal sempre que possível, com papel neutro e sem dobras marcadas. Se precisar enrolar, use tubo largo revestido com material neutro. Controle luz, umidade e temperatura. A luz solar direta é uma das maiores inimigas do bordado histórico.

6. Projeto do módulo
Faça uma ficha técnica de conservação para uma peça própria: descreva materiais, danos, riscos e plano de armazenamento. O exercício treina o olhar profissional antes da intervenção manual.`
  },
  22: {
    title: 'Módulo XXII: Design de Padrões e Cartografia do Ponto — Do Croquis ao Risco Final',
    content: `CURSO DE BORDADO - MÓDULO 22
Módulo XXII: Design de Padrões e Cartografia do Ponto — Do Croquis ao Risco Final

1. Introdução
Um bom bordado começa antes da agulha. O design de padrões transforma uma ideia visual em instrução técnica. Croquis, risco, mapa de pontos, paleta de cores e ordem de execução formam a cartografia do bordado. Sem esse planejamento, o resultado depende de improviso; com ele, a peça ganha clareza, ritmo e acabamento.

2. Do croquis ao desenho técnico
O croquis é livre, expressivo e exploratório. O risco final é limpo, proporcional e executável. Entre os dois existe uma etapa de tradução: simplificar formas, definir áreas de preenchimento, marcar direção dos pontos e prever sobreposições.

Etapas:
1. Defina tema e função da peça.
2. Faça três croquis rápidos.
3. Escolha a melhor composição.
4. Reduza detalhes impossíveis de bordar.
5. Trace o risco final com linhas claras.
6. Numere a ordem de execução.

3. Cartografia do ponto
Cada área do desenho deve receber uma intenção: contorno, preenchimento, relevo, brilho, textura ou transparência. O mapa de pontos evita conflitos. Por exemplo, ponto cheio exige espaço limpo; nó francês cria textura; ponto haste orienta movimento; couching permite linhas metálicas longas.

Monte uma legenda:
- linha contínua: ponto haste;
- área sombreada: pintura com agulha;
- pontos pequenos: nós franceses;
- linhas duplas: couching;
- área vazada: renda ou recorte.

4. Paleta e hierarquia visual
Escolha uma cor dominante, uma cor secundária e uma cor de acento. Em bordado, brilho e textura também contam como cor. Uma linha metálica pode pesar mais visualmente do que uma área grande de algodão fosco.

5. Transferência do risco
Use método adequado ao tecido: carbono para algodão, caneta apagável para estudos, alinhavo para tecidos nobres e picar e polvilhar para trabalhos históricos. Nunca use marcação permanente sem teste.

6. Exercício prático
Desenhe um motivo botânico de 10 cm. Crie três versões: monocromática, floral realista e contemporânea geométrica. Para cada uma, faça mapa de pontos e paleta. Depois borde apenas uma amostra de 5 cm para testar se o desenho funciona.

7. Projeto do módulo
Entregue um risco final pronto para execução, com legenda de pontos, paleta e sequência de trabalho. Esse documento será a base para peças autorais e para produção em ateliê.`
  },
  23: {
    title: 'Módulo XXIII: Digitalização e Bordado Computadorizado — Software, Vetorização e Teste de Matriz',
    content: `CURSO DE BORDADO - MÓDULO 23
Módulo XXIII: Digitalização e Bordado Computadorizado — Software, Vetorização e Teste de Matriz

1. Introdução
O bordado computadorizado não substitui o olhar do bordador; ele exige que esse olhar seja traduzido para comandos técnicos. A máquina precisa saber tipo de ponto, densidade, direção, sequência, compensação, troca de cor e arremate. Digitalizar é converter desenho em comportamento mecânico.

2. Conceitos fundamentais
Vetorizar não é apenas transformar imagem em contorno. Para bordado, cada forma precisa virar uma área costurável. Uma pétala pode ser preenchida com tatami, uma letra com satin, um contorno com running stitch. O digitalizador decide como a agulha vai viajar pelo tecido.

Termos essenciais:
- running stitch: ponto corrido para contornos leves;
- satin stitch: ponto acetinado para letras e faixas estreitas;
- tatami fill: preenchimento para áreas maiores;
- underlay: base de estabilização sob o bordado;
- pull compensation: compensação da contração do tecido;
- density: distância entre linhas de ponto.

3. Preparação do arquivo
Comece com imagem limpa, preferencialmente vetorial. Reduza detalhes pequenos demais. Defina tamanho final antes de digitalizar, pois ampliar ou reduzir depois altera densidade e qualidade.

Fluxo recomendado:
1. Limpe o desenho.
2. Separe cores e camadas.
3. Defina tipos de ponto por área.
4. Organize a sequência para reduzir saltos.
5. Configure underlay.
6. Exporte no formato aceito pela máquina.
7. Faça teste em tecido semelhante ao final.

4. Estabilização e teste
A mesma matriz pode funcionar em brim e falhar em malha. Por isso, teste sempre. Ajuste entretela, tensão, densidade e velocidade. Se houver franzimento, reduza densidade ou melhore estabilização. Se houver falhas, revise agulha, linha e direção dos pontos.

5. Erros comuns
Letras pequenas com satin largo demais ficam ilegíveis. Áreas grandes sem underlay deformam. Muitos pontos no mesmo lugar perfuram o tecido. Sequência mal planejada aumenta saltos e tempo de limpeza.

6. Exercício prático
Digitalize um monograma simples com uma flor lateral. Use ponto satin nas letras, running stitch no contorno e tatami leve na folha. Faça uma amostra e registre os ajustes necessários.

7. Projeto do módulo
Crie uma matriz de bordado de até 10 cm com três cores. Entregue imagem original, mapa de pontos, sequência de cores e foto da amostra. O objetivo é unir estética artesanal e precisão digital.`
  }
};

function limparTexto(texto) {
  return String(texto || '')
    .replace(/\r/g, '')
    .replace(/26\/05\/2026,\s*10:24\s*Mestre do Bordado - Curso Completo/gi, '')
    .replace(/file:\/\/\/[^\n]+/gi, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n[ \t]+/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function normalizarTitulo(titulo, fallback) {
  return String(titulo || fallback || '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 160);
}

function resumoDoConteudo(conteudo, titulo) {
  const linha = conteudo
    .split(/\n+/)
    .map((l) => l.trim())
    .find((l) => l.length > 60 && !/^curso de bordado/i.test(l) && !/^m[oó]dulo/i.test(l));
  return normalizarTitulo(linha, titulo);
}

function tituloDoModulo(conteudo, index) {
  const linhas = conteudo.split(/\n+/).map((l) => l.trim()).filter(Boolean);
  const titulo = linhas.find((l) => /^m[oó]dulo\s+/i.test(l) && !/^m[oó]dulo\s+\d+:/i.test(l));
  return normalizarTitulo(titulo || linhas[1] || linhas[0], `Módulo ${index + 1}`);
}

function aplicarOverrideSeNecessario(modulo) {
  const override = OVERRIDES[modulo.id];
  const estaQuebrado = /Aviso:\s*Ocorreu um erro ao gerar o conteúdo completo/i.test(modulo.content) || modulo.charCount < 1000;
  if (!override || !estaQuebrado) return modulo;

  return {
    ...modulo,
    title: override.title,
    summary: resumoDoConteudo(override.content, override.title),
    content: override.content,
    imageDescription: override.title,
    imageQueries: [override.title, 'bordado técnica têxtil', 'embroidery textile craft'],
    charCount: override.content.length,
    source: 'pdf-extraido-corrigido'
  };
}

function dividirEmModulos(texto) {
  const inicio = texto.search(/(?:^|\n)\s*CURSO DE BORDADO\s*-\s*M[ÓO]DULO\s+1\b/i);
  const corpo = inicio >= 0 ? texto.slice(inicio) : texto;

  const partes = corpo
    .split(/(?=(?:^|\n)\s*CURSO DE BORDADO\s*-\s*M[ÓO]DULO\s+\d{1,2}\b)/gi)
    .map((parte) => parte.trim())
    .filter((parte) => /^CURSO DE BORDADO\s*-\s*M[ÓO]DULO\s+\d{1,2}\b/i.test(parte));

  if (partes.length !== 30) {
    throw new Error(`Foram detectados ${partes.length} módulos reais no PDF; esperado: 30.`);
  }

  return partes.map((conteudo, index) => {
    const titulo = tituloDoModulo(conteudo, index);
    return aplicarOverrideSeNecessario({
      id: index + 1,
      title: titulo,
      summary: resumoDoConteudo(conteudo, titulo),
      content: conteudo,
      imageDescription: titulo,
      imageQueries: [titulo, 'bordado técnica têxtil', 'embroidery textile craft'],
      charCount: conteudo.length,
      source: 'pdf-extraido'
    });
  });
}

async function main() {
  if (!fs.existsSync(PDF_PATH)) {
    throw new Error('Arquivo public/curso-completo.pdf não encontrado. Envie o PDF completo para essa pasta.');
  }

  const buffer = fs.readFileSync(PDF_PATH);
  const resultado = await pdf(buffer);
  const texto = limparTexto(resultado.text);

  if (!texto || texto.length < 100) {
    throw new Error('O PDF foi lido, mas quase nenhum texto foi extraído. Verifique se o PDF não é apenas imagem escaneada.');
  }

  const modules = dividirEmModulos(texto);

  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(OUT_PATH, JSON.stringify({
    fonte: 'public/curso-completo.pdf',
    atualizadoEm: new Date().toISOString(),
    paginas: resultado.numpages,
    totalCaracteres: texto.length,
    totalModulos: modules.length,
    texto,
    modules
  }, null, 2), 'utf8');

  console.log(`Curso extraído com sucesso: ${resultado.numpages} páginas, ${modules.length} módulos.`);
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});

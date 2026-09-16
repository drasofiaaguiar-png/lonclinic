const fs = require('fs');
const files = [
  'data/guide/articles/o-que-e-burnout.md',
  'data/guide/articles/saude-preventiva-adultos-jovens.md',
  'data/guide/articles/psicologia-online-vs-presencial.md',
  'data/guide/articles/psicologia-online-para-burnout.md',
  'data/guide/articles/lohnt-sich-krankenversicherung-portugal.html',
  'data/guide/articles/assurance-sante-vaut-le-coup-portugal.html',
  'data/guide/articles/is-health-insurance-worth-it-portugal.html',
  'data/guide/articles/sns-vs-privat-portugal.html',
  'data/guide/articles/sns-vs-private-portugal.html',
  'data/guide/articles/sns-vs-prive-portugal.html',
  'data/guide/articles/health-insurance-portugal-guide.html',
  'data/guide/articles/krankenversicherung-portugal-leitfaden.html',
  'data/guide/articles/assurances-sante-portugal-guide.html',
  'nutricao-programa.html'
];
for (const f of files) {
  if (!fs.existsSync(f)) continue;
  let s = fs.readFileSync(f, 'utf8');
  const o = s;
  s = s.replace(/€60 · 45 min/g, '€60 · 50 min');
  s = s.replace(/\*\*45 min\*\*/g, '**50 min**');
  s = s.replace(/<strong>45 min<\/strong>/g, '<strong>50 min</strong>');
  s = s.replace(/, 45 min/g, ', 50 min');
  s = s.replace(/; 45 min/g, '; 50 min');
  s = s.replace(/é \*\*45\*\*/g, 'é **50**');
  s = s.replace(/Consultas de psicologia \(45 min\)/g, 'Consultas de psicologia (50 min)');
  if (s !== o) {
    fs.writeFileSync(f, s);
    console.log('ok', f);
  }
}

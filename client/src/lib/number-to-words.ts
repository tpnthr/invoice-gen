const units = [
  '', 'jeden', 'dwa', 'trzy', 'cztery', 'pięć', 'sześć', 'siedem', 'osiem', 'dziewięć'
];

const teens = [
  'dziesięć', 'jedenaście', 'dwanaście', 'trzynaście', 'czternaście', 
  'piętnaście', 'szesnaście', 'siedemnaście', 'osiemnaście', 'dziewiętnaście'
];

const tens = [
  '', '', 'dwadzieścia', 'trzydzieści', 'czterdzieści', 'pięćdziesiąt', 
  'sześćdziesiąt', 'siedemdziesiąt', 'osiemdziesiąt', 'dziewięćdziesiąt'
];

const hundreds = [
  '', 'sto', 'dwieście', 'trzysta', 'czterysta', 'pięćset', 
  'sześćset', 'siedemset', 'osiemset', 'dziewięćset'
];

function convertHundreds(num: number): string {
  let result = '';
  
  const h = Math.floor(num / 100);
  const remainder = num % 100;
  
  if (h > 0) {
    result += hundreds[h];
  }
  
  if (remainder >= 10 && remainder < 20) {
    if (result) result += ' ';
    result += teens[remainder - 10];
  } else {
    const t = Math.floor(remainder / 10);
    const u = remainder % 10;
    
    if (t > 0) {
      if (result) result += ' ';
      result += tens[t];
    }
    
    if (u > 0) {
      if (result) result += ' ';
      result += units[u];
    }
  }
  
  return result;
}

function getZlotyForm(amount: number): string {
  if (amount === 1) return 'złoty';
  if (amount >= 2 && amount <= 4) return 'złote';
  if (amount >= 5 && amount <= 21) return 'złotych';
  
  const lastDigit = amount % 10;
  const lastTwoDigits = amount % 100;
  
  if (lastTwoDigits >= 12 && lastTwoDigits <= 14) return 'złotych';
  if (lastDigit >= 2 && lastDigit <= 4) return 'złote';
  
  return 'złotych';
}

function getGroszForm(amount: number): string {
  if (amount === 1) return 'grosz';
  if (amount >= 2 && amount <= 4) return 'grosze';
  if (amount >= 5 && amount <= 21) return 'groszy';
  
  const lastDigit = amount % 10;
  const lastTwoDigits = amount % 100;
  
  if (lastTwoDigits >= 12 && lastTwoDigits <= 14) return 'groszy';
  if (lastDigit >= 2 && lastDigit <= 4) return 'grosze';
  
  return 'groszy';
}

export function numberToWords(amount: number): string {
  if (amount === 0) return 'zero złotych';
  
  const zloty = Math.floor(amount);
  const grosze = Math.round((amount - zloty) * 100);
  
  let result = '';
  
  if (zloty > 0) {
    if (zloty >= 1000000) {
      const millions = Math.floor(zloty / 1000000);
      result += convertHundreds(millions) + ' milion';
      if (millions > 1) result += 'ów';
      const remainder = zloty % 1000000;
      if (remainder > 0) {
        result += ' ' + convertHundreds(remainder);
      }
    } else if (zloty >= 1000) {
      const thousands = Math.floor(zloty / 1000);
      result += convertHundreds(thousands) + ' tysięc';
      if (thousands > 1 && thousands % 10 >= 2 && thousands % 10 <= 4 && 
          (thousands % 100 < 12 || thousands % 100 > 14)) {
        result = result.slice(0, -1) + 'e';
      } else if (thousands > 1) {
        result += 'y';
      }
      const remainder = zloty % 1000;
      if (remainder > 0) {
        result += ' ' + convertHundreds(remainder);
      }
    } else {
      result = convertHundreds(zloty);
    }
    
    result += ' ' + getZlotyForm(zloty);
  }
  
  if (grosze > 0) {
    if (result) result += ' ';
    result += convertHundreds(grosze) + ' ' + getGroszForm(grosze);
  }
  
  return result || 'zero złotych';
}

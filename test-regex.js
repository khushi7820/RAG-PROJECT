const normalizedText = 'okk'.toLowerCase().replace(/[^\w\s]/g, '');
const isAck = /^(ok|okk|okey|okay|k|kk|yes|yep|yup|ya|haa|haan|han|ji|thik|theek|acha|accha|hm|hmm|hmmm|no|nah|nahi|thank|thanks|shukriya)$/i.test(normalizedText);
console.log(isAck);

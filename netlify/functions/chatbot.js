// Netlify Function: AI Chatbot encadré pour GALRIVIERA
// Réponses issues d'une base validée ; aucun prix ni disponibilité inventé.

exports.handler = async (event) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Content-Type': 'application/json'
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
    }

    try {
        const body = JSON.parse(event.body || '{}');
        const message = (body.message || '').toString().trim();
        const lang = (body.language || body.lang || 'fr').toLowerCase();

        if (!message) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Message is required' })
            };
        }

        const useGrok = process.env.XAI_API_KEY && !process.env.OPENAI_API_KEY;
        const apiKey = useGrok ? process.env.XAI_API_KEY : process.env.OPENAI_API_KEY;

        if (!apiKey) {
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({
                    reply: getLocalResponse(message, lang),
                    source: 'local'
                })
            };
        }

        // Base de connaissances strictement validée — AUCUN prix ni disponibilité inventé
        const systemPrompt = `Tu es l'assistant d'information de GALRIVIERA (ABSIG CONSULTING — N° EVTC006230586), service de chauffeur privé VTC basé à Valbonne (06560) sur la Côte d'Azur.

BASE DE CONNAISSANCES VALIDÉE :
- Zones desservies : Nice, Aéroport Nice Côte d'Azur (NCE), Cannes, Antibes, Monaco / Monte-Carlo, Saint-Tropez, Valbonne, Mougins et excursions Côte d'Azur (Èze, Saint-Paul-de-Vence, etc.).
- Prestations : transferts aéroport avec suivi de vol, déplacements d'affaires et congrès, excursions privées, mise à disposition avec chauffeur, accompagnement bilingue français et anglais.
- Véhicules : Van Luxe Mercedes Classe V 220d (jusqu'à 7 passagers, salon cuir) et SUV Executive Peugeot 5008 GT (toit panoramique, cuir/alcantara), selon disponibilité.
- Options (sièges enfants, accueil personnalisé en terminal, demandes spécifiques) : disponibles sur demande et confirmées lors du devis.
- Contact direct : WhatsApp et téléphone au +33 6 82 26 73 42, email vtctransportsig@gmail.com.

RÈGLES STRICTES (À RESPECTER IMPÉRATIVEMENT) :
1. N'INVENTE JAMAIS de prix, de tarif fixe, de montant en euros ou de promotion.
2. N'INVENTE JAMAIS de disponibilité immédiate ni de délai garanti.
3. N'affirme pas d'âge précis des véhicules (ne dis pas "moins de 2 ans").
4. Pour toute question de tarif, de disponibilité ou de réservation, invite systématiquement le client à utiliser le formulaire de devis personnalisé sur le site ou à contacter GALRIVIERA sur WhatsApp (+33 6 82 26 73 42).
5. Réponds de manière concise, courtoise et professionnelle dans la langue du client (${lang}).`;

        let response;

        if (useGrok) {
            response = await fetch('https://api.x.ai/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: 'grok-2-latest',
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: message }
                    ],
                    max_tokens: 260,
                    temperature: 0.3
                })
            });
        } else {
            response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: 'gpt-4o-mini',
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: message }
                    ],
                    max_tokens: 260,
                    temperature: 0.3
                })
            });
        }

        if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
        }

        const data = await response.json();
        const reply = data.choices?.[0]?.message?.content || getLocalResponse(message, lang);

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                reply,
                source: useGrok ? 'grok' : 'openai'
            })
        };

    } catch (error) {
        console.error('Chatbot error:', error);
        const body = (() => { try { return JSON.parse(event.body || '{}'); } catch { return {}; } })();
        const fallbackLang = (body.language || body.lang || 'fr').toLowerCase();
        const fallbackMsg = (body.message || '').toString().trim();
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                reply: getLocalResponse(fallbackMsg, fallbackLang),
                source: 'fallback'
            })
        };
    }
};

// Réponses locales strictement validées (FR / EN / HE) — aucun prix ni disponibilité inventé
function getLocalResponse(message, lang) {
    const msg = message.toLowerCase();

    const responses = {
        fr: {
            tarif: "Chaque tarif est calculé sur mesure selon votre trajet, la date, le véhicule et vos options. Remplissez le formulaire de devis sur le site ou écrivez-nous sur WhatsApp au +33 6 82 26 73 42 pour recevoir votre devis personnalisé.",
            aeroport: "Nous assurons les transferts depuis et vers l'aéroport Nice Côte d'Azur (NCE). Indiquez-nous votre numéro de vol et votre terminal lors de votre demande de devis pour organiser votre accueil.",
            monaco: "Nous proposons des transferts privés et des excursions sur mesure vers Monaco, Monte-Carlo, Èze, Cannes et Saint-Tropez. Contactez-nous sur WhatsApp (+33 6 82 26 73 42) pour planifier votre itinéraire.",
            reserve: "Pour vérifier nos disponibilités et réserver, utilisez le formulaire de devis personnalisé sur cette page ou contactez GALRIVIERA sur WhatsApp au +33 6 82 26 73 42.",
            vehicule: "Nous proposons notre Van Mercedes Classe V 220d (jusqu'à 7 passagers, salon cuir) et notre SUV Executive Peugeot 5008 GT (toit panoramique) selon disponibilité. Précisez votre nombre de passagers et de bagages dans votre demande de devis.",
            default: "Bienvenue chez GALRIVIERA. Je peux vous renseigner sur nos zones desservies (Nice, Cannes, Monaco, Saint-Tropez) et nos prestations. Pour un devis personnalisé ou une disponibilité, contactez-nous sur WhatsApp au +33 6 82 26 73 42."
        },
        en: {
            tarif: "Each rate is tailored to your route, date, vehicle category and options. Please use our quote form on the website or contact us on WhatsApp at +33 6 82 26 73 42 to receive your personalized quote.",
            aeroport: "We provide private transfers to and from Nice Côte d'Azur Airport (NCE). Share your flight number and terminal in your quote request so we can organize your pick-up.",
            monaco: "We offer private transfers and tailored excursions to Monaco, Monte-Carlo, Èze, Cannes and Saint-Tropez. Contact us on WhatsApp (+33 6 82 26 73 42) to plan your trip.",
            reserve: "To check availability and book, please complete the personalized quote form on this page or message GALRIVIERA on WhatsApp at +33 6 82 26 73 42.",
            vehicule: "We offer premium sedans and spacious luxury vans (up to 7 passengers), subject to availability. Let us know your passenger and luggage count in your quote request.",
            default: "Welcome to GALRIVIERA. I can assist with information about our services across Nice, Cannes, Monaco and Saint-Tropez. For a personalized quote or availability, message us on WhatsApp at +33 6 82 26 73 42."
        },
        he: {
            tarif: "המחיר נקבע בהתאמה אישית לפי המסלול, התאריך, קטגוריית הרכב והבקשות המיוחדות. מלאו את טופס הצעת המחיר באתר או צרו קשר בוואטסאפ במספר +33 6 82 26 73 42.",
            aeroport: "אנו מבצעים הסעות פרטיות משדה התעופה ניס (NCE) ואליו. ציינו את מספר הטיסה והטרמינל בבקשת הצעת המחיר כדי שנוכל לתאם את קבלת הפנים.",
            monaco: "אנו מציעים הסעות וסיורים פרטיים למונקו, מונטה קרלו, אז, קאן וסן טרופה. צרו איתנו קשר בוואטסאפ (+33 6 82 26 73 42) לקבלת הצעת מחיר.",
            reserve: "לבדיקת זמינות והזמנה, מלאו את טופס הצעת המחיר באתר או שלחו לנו הודעה בוואטסאפ במספר +33 6 82 26 73 42.",
            vehicule: "אנו מציעים רכבי סדאן יוקרתיים וואנים מרווחים (עד 7 נוסעים) בהתאם לזמינות. ציינו מספר נוסעים ומזוודות בבקשתכם.",
            default: "ברוכים הבאים ל-GALRIVIERA. לקבלת הצעת מחיר מותאמת אישית או לבדיקת זמינות בניס, קאן, מונקו וסן טרופה, צרו קשר בוואטסאפ: +33 6 82 26 73 42."
        }
    };

    const r = responses[lang] || responses.fr;

    if (msg.includes('tarif') || msg.includes('prix') || msg.includes('price') || msg.includes('cost') || msg.includes('מחיר')) return r.tarif;
    if (msg.includes('aeroport') || msg.includes('aéroport') || msg.includes('airport') || msg.includes('vol') || msg.includes('flight') || msg.includes('שדה')) return r.aeroport;
    if (msg.includes('monaco') || msg.includes('monte-carlo') || msg.includes('casino') || msg.includes('מונקו')) return r.monaco;
    if (msg.includes('reserver') || msg.includes('réserver') || msg.includes('book') || msg.includes('reservation') || msg.includes('הזמנ')) return r.reserve;
    if (msg.includes('vehicule') || msg.includes('véhicule') || msg.includes('mercedes') || msg.includes('van') || msg.includes('voiture') || msg.includes('רכב')) return r.vehicule;

    return r.default;
}

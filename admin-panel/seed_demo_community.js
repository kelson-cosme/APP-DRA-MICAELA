import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://jnorizuimmorlumefctn.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impub3JpenVpbW1vcmx1bWVmY3RuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjQ2ODczOCwiZXhwIjoyMDg4MDQ0NzM4fQ.UUsb2YGrtvqmJqtiKvbQ5Ag2RIT_le4i9Xb3r85dgPo';

const supabase = createClient(supabaseUrl, supabaseKey);

async function seed() {
    console.log('Fetching profiles...');
    const { data: profiles, error: errProf } = await supabase.from('profiles').select('id, full_name, avatar_url');

    if (errProf) {
        console.error('Error fetching profiles:', errProf);
        return;
    }

    if (!profiles || profiles.length === 0) {
        console.log('No profiles found in the database. Creating a dummy profile...');
        // To seed if no profiles exist
        return;
    }

    console.log(`Found ${profiles.length} profiles.`);

    const user1 = profiles[0];
    const user2 = profiles.length > 1 ? profiles[1] : profiles[0];
    const user3 = profiles.length > 2 ? profiles[2] : profiles[0];

    const posts = [
        {
            user_id: user1.id,
            content_text: "Bem-vindas à nossa nova Comunidade Exclusiva! ✨\nEste espaço foi criado com muito carinho para trocarmos experiências, dividirmos as vitórias e nos apoiarmos. Deixem suas apresentações aqui nos comentários para eu conhecer um pouco mais de cada uma de vocês! 💖",
            image_url: null
        },
        {
            user_id: user2.id,
            content_text: "Dra. Micaela, queria agradecer muito pela mentoria de ontem! As dicas sobre a organização da rotina me ajudaram a ter uma manhã muito mais leve hoje com o bebê. Alguém mais já testou o ritual matinal que ela ensinou?",
            image_url: null
        },
        {
            user_id: user3.id,
            content_text: "Boa tarde, comunidade! Sou nova por aqui e acabei de descobrir a gestação (7 semanas!). Estou um pouco ansiosa e com muito enjoo, mas muito feliz de ter esse espaço seguro para aprendermos juntas. \nAlguém tem dicas reais para amenizar os enjoos matinais? 🤢🤰",
            image_url: null
        }
    ];

    console.log('Inserting demo posts...');
    const { data: insertedPosts, error: errPosts } = await supabase.from('community_posts').insert(posts).select();

    if (errPosts) {
        console.error('Error inserting posts:', errPosts);
        return;
    }

    console.log('Posts inserted successfully!');

    if (insertedPosts && insertedPosts.length > 0) {
        const comentarios = [
            {
                post_id: insertedPosts[2].id, // Comentario no post de enjoo
                user_id: user1.id,
                text: "Bem-vinda, querida! Que notícia maravilhosa. 🎉\nNa próxima aula ao vivo falaremos bastante sobre esse início e o alívio dos sintomas. Chás de gengibre e focar na hidratação fracionada são os primeiros passos. Um abraço fortíssimo!"
            },
            {
                post_id: insertedPosts[2].id, // Outro comentario no post de enjoo
                user_id: user2.id,
                text: "Parabéns!! Eu sofri muito com enjoos até a 12ª semana. Pequenos pedaços de gengibre de manhã me salvavam demais haha. Vai passar, confia! ❤️"
            },
            {
                post_id: insertedPosts[0].id, // Comentario no post de apresentacao
                user_id: user3.id,
                text: "Oi! Sou a Marina, de São Paulo. Estou acompanhando os vídeos há 1 mês e amando a didática. Focada agora na preparação para engravidar. Prazer em conhecer todas!"
            }
        ];

        console.log('Inserting demo comments...');
        const { error: errComments } = await supabase.from('community_comments').insert(comentarios);
        if (errComments) {
            console.error('Error inserting comments:', errComments);
        } else {
            console.log('Comments inserted!');
        }
    }
}

seed();

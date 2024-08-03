export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const uriPath = url.pathname;
    if (uriPath === "/roast") {
      try {
        let username: string | null = null;
        if (request.method === "POST") {
          const formData = await request.formData();
          username = formData.get("username") as string;
        } else if (request.method === "GET") {
          username = url.searchParams.get("username");
        }
        if (!username) {
          return new Response(
            JSON.stringify({
              error: "Username is required"
            }),
            {
              status: 400
            }
          );
        }

        const headers = {
          "Authorization": `Bearer ${env.GH_API_KEY}`
        };

        const profileResponse = await fetch(`https://api.github.com/users/${username}`, { headers });
        if (!profileResponse.ok) {
          return new Response(
            JSON.stringify({
              error: "Failed to fetch profile data"
            }),
            {
              status: profileResponse.status
            }
          );
        }
        const profileData = await profileResponse.json();

        const repoResponse = await fetch(`https://api.github.com/users/${username}/repos?sort=updated`, { headers });
        const repoData = await repoResponse.json();

        let readmeData: { status: number; data: string | null } = { status: 404, data: null };
        try {
          const readmeResponse = await fetch(`https://raw.githubusercontent.com/${username}/${username}/main/README.md`);
          if (readmeResponse.ok) {
            readmeData = { status: 200, data: await readmeResponse.text() };
          }
        } catch (error) {
          try {
            const readmeResponse = await fetch(`https://raw.githubusercontent.com/${username}/${username}/master/README.md`);
            if (readmeResponse.ok) {
              readmeData = { status: 200, data: await readmeResponse.text() };
            }
          } catch (error) {
            console.log("Failed to get README");
          }
        }

        const datas = {
          name: profileData.name,
          bio: profileData.bio,
          company: profileData.company,
          location: profileData.location,
          followers: profileData.followers,
          following: profileData.following,
          public_repos: profileData.public_repos,
          repositories: repoData
            .map((repo: any) => ({
              name: repo.name,
              description: repo.description,
              language: repo.language,
              stargazers_count: repo.stargazers_count,
              open_issues_count: repo.open_issues_count,
              license: repo.license,
              fork: repo.fork
            }))
            .slice(0, 50)
        };

        let prompt = `berikan roasting singkat dengan kejam dan menyindir dalam bahasa gaul untuk profile github berikut : ${username}. Berikut detailnya: "${JSON.stringify(datas)}"`;
        if (profileData.location && !profileData.location.includes("Indonesia")) {
          prompt = `give a short and harsh roasting for the following github profile: ${username}. Here are the details: "${JSON.stringify(datas)}"`;
        }

        if (readmeData.status === 200 && readmeData.data) {
          prompt += `, Profile Markdown: \`\`\`${readmeData.data}\`\`\``;
        } else {
          prompt += `, Profile Markdown: Not Found`;
        }

        if (!profileData.location || profileData.location.includes("Indonesia")) {
          prompt += `. (berikan response dalam bahasa indonesia dan jangan berikan pujian atau saran serta jangan berikan kata-kata terlalu kasar)`;
        } else {
          prompt += `. (provide the response in English and do not provide praise or advice and do not use explicit words)`;
        }

        const apiResponse = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${env.GEMINI_API_KEY}`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              prompt
            })
          }
        );

        if (!apiResponse.ok) {
          const errorText = await apiResponse.text();
          console.log(`Error from API: ${errorText}`);
          return new Response(
            JSON.stringify({
              error: "Failed to generate content",
              type: "API"
            }),
            {
              status: apiResponse.status
            }
          );
        }

        const result = await apiResponse.json();
        return new Response(
          JSON.stringify({
            roasting: result.text
          }),
          {
            status: 200
          }
        );
      } catch (error) {
        console.log(error);
        return new Response(
          JSON.stringify({
            error: error.message,
            type: "Server"
          }),
          {
            status: 500
          }
        );
      }
    }
    return new Response("Not found", {
      status: 404
    });
  }
};
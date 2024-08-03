export default {
 async fetch(request: Request, env: Env): Promise < Response > {
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
    try {
     const profileFetch = await fetch(
      `https://api.github.com/users/${username}`
     );
     profileResponse = await profileFetch.json();
    } catch (error) {
     console.log("Failed to fetch profile data");
    }

    const repoFetch = await fetch(
     `https://api.github.com/users/${username}/repos?sort=updated`
    );
    const repoResponse = await repoFetch.json();

    try {
     const readmeFetch = await fetch(
      `https://raw.githubusercontent.com/${username}/${username}/main/README.md`
     );
     readmeResponse = {
      status: 200,
      data: await readmeFetch.text()
     };
    } catch (error) {
     try {
      const readmeFetch = await fetch(
       `https://raw.githubusercontent.com/${username}/${username}/master/README.md`
      );
      readmeResponse = {
       status: 200,
       data: await readmeFetch.text()
      };
     } catch (error) {
      console.log("Failed to get README");
     }
    }

    datas = {
     name: profileResponse.name,
     bio: profileResponse.bio,
     company: profileResponse.company,
     location: profileResponse.location,
     followers: profileResponse.followers,
     following: profileResponse.following,
     public_repos: profileResponse.public_repos,
     repositories: repoResponse
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

    let prompt = `berikan roasting singkat dengan kejam dan menyindir dalam bahasa gaul untuk profile github berikut : ${username}. Berikut detailnya: "${JSON.stringify(
     datas
    )}"`;
    if (
     profileResponse.location &&
     !profileResponse.location.includes("Indonesia")
    ) {
     prompt = `give a short and harsh roasting for the following github profile: ${username}. Here are the details: "${JSON.stringify(
      datas
     )}"`;
    }

    if (readmeResponse.status === 200 && readmeResponse.data) {
     prompt += `, Profile Markdown: \`\`\`${readmeResponse.data}\`\`\``;
    } else {
     prompt += `, Profile Markdown: Not Found`;
    }

    if (
     !profileResponse.location ||
     profileResponse.location.includes("Indonesia")
    ) {
     prompt += `. (berikan response dalam bahasa indonesia dan jangan berikan pujian atau saran serta jangan berikan kata-kata terlalu kasar)`;
    } else {
     prompt += `. (provide the response in English and do not provide praise or advice and do not use explicit words)`;
    }

    const response = await fetch(
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

    const result = await response.json();
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
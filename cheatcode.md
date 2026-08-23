docker run -d \
  --name focusflow-db-local \
  -e POSTGRES_USER=focus_user \
  -e POSTGRES_PASSWORD=changeme \
  -e POSTGRES_DB=focusflow \
  -p 5432:5432 \
  postgres:16             CREATED A POSTGRES CONTAINER & RUNNING IMAGE TO ACTUALLY STORE THE TABLE IN USING THE SAME CRED IN .ENV FILE

  docker ps               SHOW ALL THE  CONTAINERS ON OUR DOCKER MACHINE

  docker exec -i focusflow-db-local psql -U focus_user -d focusflow < database/init.sql  RUN THE CODE IN THE FILE TO CREATE A TABLE IN THE CONTAINER & INSERT SOME DATA.

  docker exec -it focusflow-db-local psql -U focus_user -d focusflow -c "\dt"   LISTED OUT ALL THE TABLES CREATED IN THE CONTAINER.

  docker exec -it focusflow-db-local psql -U focus_user -d focusflow -c "SELECT * FROM focus_sessions;"    SHOW ALL THE DATE IN A PARTICULAR TABLE FROM A CONTAINER.

cd backend
cp .env.example .env
npm install
npm start     CREATE .ENV FILE,INSTALL ALL DEPENDENCIES AND START THE SERVER

docker stop focusflow-db-local
curl http://localhost:5000/health
docker start focusflow-db-local
curl http://localhost:5000/api/sessions
curl http://localhost:5000/api/sessions/stats
curl -X POST http://localhost:5000/api/sessions \
  -H "Content-Type: application/json" \
  -d '{"task":"Test the backend","category":"DevOps","duration":30,"mood":"Curious"}'               CONFIRM THE SUCCESFFUL CONNECTION AND MADE A GET all GET ANd POST request

app.use('/api/sessions', sessionsRouter);   ANY REQUEST LIKE curl http://localhost:5000/api/sessions SHOULD GO TO sessionsRouter(a variable that goes to) THE FOLDER routers/sessions(prefixes) for other contents in the sessions.js file 

create Dockerfile at the backend root and ran docker build -t focusflow-backend:test .       (likely broke due to network issues so try pulling the image continuously first till it completely installs eg docker pull node:20-alpine before running docker build -t focusflow-backend:test .  again)

docker network create focusflow-net   CREATE A NETWORK SO THE BACKEND AND POSTGRES CONTAINERS CAN COMMUNICATE WITH EACH OTHER ORDER THAN YOUR LOCAL IP.

docker network connect focusflow-net focusflow-db-local  CONNECTS THE  POSTGRES CONTAINER TO THE DOCKER CREATED NETWORK

docker run -d \
  --name focusflow-backend-test \
  --network focusflow-net \
  -p 5000:5000 \
  -e DB_HOST=focusflow-db-local \
  -e DB_PORT=5432 \
  -e DB_NAME=focusflow \
  -e DB_USER=focus_user \
  -e DB_PASSWORD=changeme \
  -e PORT=5000 \
  focusflow-backend:test    CREATED THE BACKEND CONTAINER AND JOINED WITH THE CREATED NETWORK AND SAME USER,NAME AND PASSWORD(LIKE SAME CREDENTIALS FOR ALL CONTAINERS RUNNING UNDER THIS PROJECT) FROM .ENV SO BOTH CONTAINERS CAN COMMUNINCATES WITH THEI OWN PORT.

  curl http://localhost:5000/health  CHECK IF THE BOTH CONTAINERS ARE RESPONDING(POOL.QUERY.. USES THE .ENV DB.JS CONFIGURATIONS TO MAKE A )

create Dockerfile and ngix.conf file for fronend  WE NEED TO BUILD THE NODE VITE IMAGE AND THEN THE NGIX IMAGE WHICH WILL COPY THE DIRT FOLDER FROM NOTE VITE AND DISPOSE ITSELF.

THEN ADDED THE FRONTEND SERVICE AS THE THIRD SERVICE IN THE DOCKER COMPOSE FILE

docker compose up --build   THEN REBUILD EVERYTHING   (somethings might not build because RUN npm install at the db docker file must be installed in docker other wise use RUN npm ci)

tested the app using localhost:8000 (if the frontend and backend images is not runningthe site wount show and if the backend image is not running the logs wont show or record requests)

next we make use of docker hub to store our built images so it can be pulled by other machines like linux VM for free rather than using azure acr registtras.(prefared by startups tho)

touch .gitignore
git add .
git commit -m "Initial commit: FocusFlow 3-tier app with Docker setup"
git log --oneline -1      NOW WE CREATED THE GITIGNORE ROOT FILE AND HEN ADD,COMMIT AND SHOW LOGS OF WHAT WE DID WHEN WE COMMIT, WHILE THE initial commit will give us a 7character(b1e46eb) that we will use as the image tag.

docker tag focusflow-capstone-backend glaciercodes/focusflow-backend:b1e46eb
docker tag focusflow-capstone-backend glaciercodes/focusflow-backend:latest
docker push glaciercodes/focusflow-backend:b1e46eb
docker push glaciercodes/focusflow-backend:latest

docker tag focusflow-capstone-frontend glaciercodes/focusflow-frontend:b1e46eb
docker tag focusflow-capstone-frontend glaciercodes/focusflow-frontend:latest
docker push glaciercodes/focusflow-frontend:b1e46eb
docker push glaciercodes/focusflow-frontend:latest      //use the SHA hash from git log to suffix out retaged images so we can easily identify what code made an image eg git checkout b1e46eb which shows u the files and folders that specific image has when it was created.   ALSO WE RETAGGED THE FRONTEND AND BACKEND TWICE SO ONE b1e46eb GIVES US A PERMANENT UNIQUE VERSION NAME TO TRACE CODE WHILE LATEST SHOWS THE NEWEST COD ECHANGES AND GETS OVERWRITEEN WHEN A NEW VERSION COMES OUT acts like git branchs.(git branch tacks changes made to your folder and git checkout b1e46eb -commit hash shows and pamently keep the exact folder and files that images contain)

WE MAKE THE infra/provision-vm.sh file and wrote our bashscript, and run it with (chmod +x infra/provision-vm.sh && ./infra/provision-vm.sh) to our vm in a resource group, open two ports and then showed the public ip we will use to ssh into. might have issues creating so you check which regions are current available on standard b1s vm size eg az vm list-skus --size Standard_B1s --all --output table(regions showing none) if staying within free teir budget after upfgrading.

ssh azureuser@9.205.154.124  ssh into the newnly created empty vm 

curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER    //INSTALLED DOCKER AND DOCKERCOMPOSE ON THE FRESH UBUNTU VM, WHILE THE 2ND LINE LETS THE USER RUN DOCKER WITHOUT TYPING SUDU EVERYTIME WHICH TAKES EFFECT AFTER YOU LOG OUT

exit
ssh azureuser@9.205.154.124
docker --version
docker compose version     //exit FROM THE VM SSH IN AGAIN AND CHECK BOTH DOCKER AND DOCKER COMPOSE ARE INSTALLED ON THE VM.

NEXT EXIT YOUR VM AND RUN scp docker-compose.yml azureuser@9.205.154.124:~/docker-compose.yml    TO COPY THE DOCKERCOMPOSE FILE IN UR SOURCE CODE INTO THE VM MACHINE SINCE THE VM WILL PULL THE ALREADY BUILT IMAGE FROM DOCKER COMPOSE.

create and docker-compose.prod.yml script so vm can pull from already built image(changing it from nuilg to image and making the port for this images to be access public) since it cant build from a source code which is not in out vm.

scp docker-compose.prod.yml azureuser@9.205.154.124:~/docker-compose.yml
scp database/init.sql azureuser@9.205.154.124:~/init.sql   //NOW COPY THE DOCKER-COMPOSE PROD FILE AND THE INIT.SQL FILE INTO SSH since db reference to it locally

ssh azureuser@9.205.154.124
docker compose up -d   //SSH INTO YOUR VM AND THEN pull UP THE already built images and THE POSTGRES IMAGES ALREADY AN INBUILT IMAGE from DOCKER HUB.

docker compose ps
curl http://localhost:5000/health   //CHECKED IF THE BUILD UP WAS SUCCESSFUL TO SHOW ALL IMAGES IN THE VM, AND THEN CURL THE HEALTH API TO BE SURE THE THREE LAYER ARE CONNECTED WHICH RETURNS STATUS:OK AND DB:CONNECTED.

cat > .env << 'EOF'
DB_USER=secretuser
DB_PASSWORD=secretpass
DB_NAME=secretname
EOF                     //created a .env file to keep this exposed cred at the both yml files.

echo ".env" >> .gitignore  //also dont forget to git ignore the .env file before pushing to github.

    environment:
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_DB: ${DB_NAME}  //confirm replacing this frontend yml script at your source code before pushing to.
    environment:
      DB_HOST: db
      DB_PORT: 5432
      DB_NAME: ${DB_NAME}
      DB_USER: ${DB_USER}
      DB_PASSWORD: ${DB_PASSWORD}
      PORT: 5000 //and to your backend

scp docker-compose.prod.yml azureuser@9.205.154.124:~/docker-compose.yml
ssh azureuser@9.205.154.124    //be sure to update and replace the both updated files //now update and replace both file into your vm,


cat > .env.example << 'EOF'
DB_USER=secretuser
DB_PASSWORD=secretpass
DB_NAME=secretname
EOF   
docker compose up -d  //ssh into your vm and then create the .env file to store the cred, and then rerun the docker compose file

grep -r "secretname" --include="*.yml" .    //use this script to check if there is your specific cred is exposed on any yml file



gh auth status //CONFIRMED AM LOGGED IN ON GITHUB

git remote add origin https://github.com/<your-username>/focusflow-capstone.git
git branch -M main
git push -u origin main  //add a remote to my git folder,coverted the master branch to main and then push the folder to my githuh main branch.
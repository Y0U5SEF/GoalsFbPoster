RUN git clone https://github.com/Y0U5SEF/GoalsFbPoster

WORKDIR /root/guru/

RUN npm install --platform=linuxmusl

EXPOSE 5000

CMD ["npm", "start"]
